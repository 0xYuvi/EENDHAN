from fastapi import Request, Header, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Optional
from algosdk.v2client.algod import AlgodClient
from db.supabase_client import supabase
from x402_custom.validator import X402Validator
from core.config import (
    ALGOD_ADDRESS,
    ALGOD_TOKEN,
    EENDHAN_APP_ADDRESS,
    DEFAULT_ENDPOINT_ID,
)

# Initialize Algorand Client and Validator
algod_client = AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
validator = X402Validator(algod_client, EENDHAN_APP_ADDRESS)


async def x402_payment_required(
    request: Request,
    x_payment: Optional[str] = Header(None, alias="X-Payment"),
    x_ai_tier: Optional[str] = Header(None, alias="X-AI-Tier"),
):
    """
    Dependency that intercepts requests.
    Returns 402 if no payment header.
    Verifies payment if header exists.
    """
    endpoint_id = request.path_params.get("endpoint_id")
    if not endpoint_id:
        # Fallback to default if not dynamic
        endpoint_id = DEFAULT_ENDPOINT_ID

    # Fetch dynamic endpoint config from Supabase
    try:
        endpoint_res = (
            supabase.table("endpoints")
            .select("*")
            .eq("id", endpoint_id)
            .single()
            .execute()
        )
        if not endpoint_res.data:
            raise HTTPException(status_code=404, detail="Endpoint not found")

        endpoint_data = endpoint_res.data
        pricing_tiers = endpoint_data.get("pricing_tiers") or {}

        # Determine tier from header, default to "basic"
        requested_tier = x_ai_tier or "basic"

        # Get price for the requested tier, fallback to default price_usdc
        if requested_tier in pricing_tiers:
            endpoint_price_usdc = (
                float(pricing_tiers[requested_tier]) / 1_000_000
            )  # Convert from micro-USDC
        else:
            # Fallback to price_usdc if tier not found
            endpoint_price_usdc = float(endpoint_data.get("price_usdc", 0.01))

        # Store tier info for downstream use
        endpoint_data["requested_tier"] = requested_tier
        endpoint_data["tier_price_usdc"] = endpoint_price_usdc

        target_wallet = endpoint_data.get("creator_wallet") or EENDHAN_APP_ADDRESS

        # Store for the route handler to use (like target_url)
        request.state.endpoint_info = endpoint_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed fetching endpoint: {e}")

    if not x_payment:
        # Get current status from Algorand
        status_info = algod_client.status()
        last_round = status_info.get("last-round", 0)

        import time

        expires_at = int(time.time()) + 60
        suggested_last_round = last_round + 20

        # Issue Challenge (returns 402 Payment Required) using dynamic wallet and USDC price
        challenge = validator.issue_challenge(
            price_algo=endpoint_price_usdc,
            endpoint=request.url.path,
            expires_at=expires_at,
            last_round=suggested_last_round,
            receiver_address=target_wallet,
        )

        # Save pending session
        try:
            session_res = (
                supabase.table("payment_sessions")
                .insert(
                    {
                        "endpoint_id": endpoint_id,
                        "consumer_wallet": "unknown_yet",
                        "target_wallet": target_wallet,
                        "amount_usdc": endpoint_price_usdc,
                        "tier": requested_tier,
                        "nonce": challenge["x402"]["conditions"]["description"],
                        "status": "pending",
                        "expires_at": expires_at,
                    }
                )
                .execute()
            )

            challenge["sessionId"] = session_res.data[0]["id"]

            # Create execution tracking row
            try:
                supabase.table("backend_executions").insert(
                    {
                        "session_id": challenge["sessionId"],
                        "endpoint_id": endpoint_id,
                        "status": "pending_payment",
                    }
                ).execute()
            except Exception as e:
                print(f"[WARN] DB execution track creation failed: {e}")

        except Exception as db_err:
            print(f"[WARN] DB session logging failed: {db_err}")
            import uuid

            challenge["sessionId"] = str(uuid.uuid4())

        return JSONResponse(
            status_code=402,
            content={
                **challenge,
                "requestedTier": requested_tier,
                "tierPricing": pricing_tiers,
            },
        )

    else:
        try:
            parts = {}
            for item in x_payment.split(","):
                key, val = item.split("=", 1)
                parts[key.strip()] = val.strip()

            tx64 = parts.get("tx64", "").strip()
            session_id = parts.get("session", "").strip()

            # Check for Session Expiration before validation (graceful fallback if DB fails)
            try:
                session_data = (
                    supabase.table("payment_sessions")
                    .select("expires_at")
                    .eq("id", session_id)
                    .single()
                    .execute()
                )
                if session_data.data:
                    import time

                    if int(time.time()) > session_data.data["expires_at"]:
                        raise HTTPException(
                            status_code=402,
                            detail="Session expired. Please request a new challenge.",
                        )
            except HTTPException:
                raise
            except Exception as e:
                print(
                    f"[WARN] Could not check session expiration via DB (falling back to on-chain): {e}"
                )

            result = validator.verify_payment(
                tx64, session_id, supabase, receiver_address=target_wallet
            )

            if not result["success"]:
                raise HTTPException(status_code=402, detail=result["error"])

            # Update execution tracking
            try:
                exec_res = (
                    supabase.table("backend_executions")
                    .update({"status": "payment_verified"})
                    .eq("session_id", session_id)
                    .execute()
                )

                if exec_res.data:
                    request.state.execution_id = exec_res.data[0]["execution_id"]
            except Exception as e:
                print(f"[WARN] DB execution track update failed: {e}")

            return result
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=400, detail=f"Invalid X-Payment header format: {str(e)}"
            )
