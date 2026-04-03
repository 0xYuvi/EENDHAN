from fastapi import APIRouter, HTTPException, status, Header, Depends
from typing import Optional
from uuid import uuid4
from datetime import datetime, timedelta
from db.supabase_client import supabase
from core.config import MANDATE_APP_ID, MANDATE_APP_ADDRESS

router = APIRouter(prefix="/api/agents", tags=["mandates"])

# In-memory rate limiting (use Redis in production)
rate_limits: dict = {}


def check_rate_limit(client_ip: str) -> bool:
    """100 req/min per IP sliding window"""
    now = datetime.now()
    if client_ip not in rate_limits:
        rate_limits[client_ip] = []

    # Clean old entries
    rate_limits[client_ip] = [
        t for t in rate_limits[client_ip] if now - t < timedelta(minutes=1)
    ]

    if len(rate_limits[client_ip]) >= 100:
        return False

    rate_limits[client_ip].append(now)
    return True


def check_velocity_cap(agent_id: str, amount: int) -> dict:
    """Check velocity cap ($50 USDC / 10 min default)"""
    VELOCITY_LIMIT = 50_000_000  # $50 in micro-USDC
    VELOCITY_WINDOW = 600  # 10 seconds (for API, not rounds)

    now = datetime.now()
    key = f"velocity_{agent_id}"

    if key not in rate_limits:
        rate_limits[key] = []

    # Clean old entries
    rate_limits[key] = [
        (t, amt)
        for t, amt in rate_limits[key]
        if now - t < timedelta(seconds=VELOCITY_WINDOW)
    ]

    total = sum(amt for _, amt in rate_limits[key])

    if total + amount > VELOCITY_LIMIT:
        return {
            "velocityCapped": True,
            "currentSpend": total,
            "limit": VELOCITY_LIMIT,
            "windowSeconds": VELOCITY_WINDOW,
        }

    rate_limits[key].append((now, amount))
    return {"velocityCapped": False}


@router.post("/{agent_id}/mandate/create")
async def create_mandate(
    agent_id: str,
    x_pera_auth: Optional[str] = Header(None, alias="X-Pera-Auth"),
    max_txn: int = 10_000_000,
    max_velocity: int = 50_000_000,
    max_daily: int = 500_000_000,
):
    """Create a mandate for an agent (requires Pera Connect auth)"""
    if not x_pera_auth:
        raise HTTPException(status_code=401, detail="Pera Connect auth required")

    # In production: verify Pera wallet signature
    # For now: check auth token

    try:
        mandate_id = str(uuid4())

        supabase.table("mandates").insert(
            {
                "id": mandate_id,
                "agent_id": agent_id,
                "max_txn_amount": max_txn,
                "max_velocity_amount": max_velocity,
                "max_daily_amount": max_daily,
                "status": "active",
                "created_at": datetime.now().isoformat(),
            }
        ).execute()

        return {
            "mandateId": mandate_id,
            "status": "active",
            "limits": {
                "maxTxn": max_txn,
                "maxVelocity": max_velocity,
                "maxDaily": max_daily,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{agent_id}/mandate/{mandate_id}/revoke")
async def revoke_mandate(
    agent_id: str,
    mandate_id: str,
    x_pera_auth: Optional[str] = Header(None, alias="X-Pera-Auth"),
):
    """Revoke a mandate immediately"""
    if not x_pera_auth:
        raise HTTPException(status_code=401, detail="Pera Connect auth required")

    try:
        supabase.table("mandates").update(
            {"status": "revoked", "revoked_at": datetime.now().isoformat()}
        ).eq("id", mandate_id).eq("agent_id", agent_id).execute()

        return {"status": "revoked", "mandateId": mandate_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{agent_id}/mandates")
async def list_mandates(agent_id: str):
    """List active mandates and usage stats"""
    try:
        mandates = (
            supabase.table("mandates").select("*").eq("agent_id", agent_id).execute()
        )

        formatted = []
        for m in mandates.data:
            formatted.append(
                {
                    "mandateId": m["id"],
                    "status": m["status"],
                    "limits": {
                        "maxTxn": m["max_txn_amount"],
                        "maxVelocity": m["max_velocity_amount"],
                        "maxDaily": m["max_daily_amount"],
                    },
                    "createdAt": m["created_at"],
                }
            )

        return {"mandates": formatted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{agent_id}/mandate/approval-token")
async def issue_approval_token(
    agent_id: str,
    x_pera_auth: Optional[str] = Header(None, alias="X-Pera-Auth"),
):
    """Issue short-lived token for one-off approval"""
    if not x_pera_auth:
        raise HTTPException(status_code=401, detail="Pera Connect auth required")

    token = str(uuid4())
    expires_at = datetime.now() + timedelta(minutes=5)

    try:
        supabase.table("approval_tokens").insert(
            {
                "token": token,
                "agent_id": agent_id,
                "expires_at": expires_at.isoformat(),
                "used": False,
            }
        ).execute()

        return {"token": token, "expiresIn": 300, "expiresAt": expires_at.isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def rate_limit_middleware(request, call_next):
    """Middleware for rate limiting"""
    client_ip = request.client.host

    if not check_rate_limit(client_ip):
        from fastapi.responses import JSONResponse

        return JSONResponse(
            status_code=429, content={"error": "Rate limited", "retryAfter": 60}
        )

    return call_next(request)
