from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timedelta
from typing import Dict, List
import time

rate_limit_store: Dict[str, List[datetime]] = {}
velocity_store: Dict[str, List[tuple]] = {}

RATE_LIMIT = 100  # req/min
BURST_LIMIT = 5  # req/10s
VELOCITY_LIMIT = 50_000_000  # micro-USDC ($50)
VELOCITY_WINDOW = 600  # 10 minutes
NONCE_WINDOW = 60  # seconds
PAYMENT_EXPIRY = 300  # 5 minutes


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        path = request.url.path

        # Skip rate limiting for health checks
        if path in ["/health", "/"]:
            return await call_next(request)

        now = datetime.now()

        # Clean old entries
        if client_ip in rate_limit_store:
            rate_limit_store[client_ip] = [
                t for t in rate_limit_store[client_ip] if now - t < timedelta(minutes=1)
            ]
        else:
            rate_limit_store[client_ip] = []

        # Check per-minute rate limit
        if len(rate_limit_store[client_ip]) >= RATE_LIMIT:
            from fastapi.responses import JSONResponse

            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limited",
                    "retryAfter": 60,
                    "limit": RATE_LIMIT,
                    "scope": "per_minute",
                },
            )

        # Check burst cap (5 req / 10s)
        burst_key = f"burst_{client_ip}"
        if burst_key in velocity_store:
            velocity_store[burst_key] = [
                t for t in velocity_store[burst_key] if now - t < timedelta(seconds=10)
            ]
        else:
            velocity_store[burst_key] = []

        if len(velocity_store[burst_key]) >= BURST_LIMIT:
            from fastapi.responses import JSONResponse

            return JSONResponse(
                status_code=429,
                content={
                    "error": "Burst limit exceeded",
                    "retryAfter": 60,
                    "limit": BURST_LIMIT,
                    "scope": "per_10_seconds",
                },
            )

        velocity_store[burst_key].append(now)
        rate_limit_store[client_ip].append(now)

        response = await call_next(request)
        return response


def check_velocity_cap(agent_id: str, amount: int) -> dict:
    """Check velocity cap ($50 USDC / 10 min)"""
    now = datetime.now()
    key = f"velocity_{agent_id}"

    if key not in velocity_store:
        velocity_store[key] = []

    # Clean old entries
    velocity_store[key] = [
        (t, amt)
        for t, amt in velocity_store[key]
        if now - t < timedelta(seconds=VELOCITY_WINDOW)
    ]

    total = sum(amt for _, amt in velocity_store[key])

    if total + amount > VELOCITY_LIMIT:
        return {
            "velocityCapped": True,
            "currentSpend": total,
            "limit": VELOCITY_LIMIT,
            "windowSeconds": VELOCITY_WINDOW,
        }

    velocity_store[key].append((now, amount))
    return {"velocityCapped": False}


def check_payment_expiry(expires_at: int) -> bool:
    """Check if payment proof has expired (5 minutes)"""
    import time

    return time.time() > expires_at


def get_nonce_window() -> int:
    return NONCE_WINDOW


def get_payment_expiry() -> int:
    return PAYMENT_EXPIRY
