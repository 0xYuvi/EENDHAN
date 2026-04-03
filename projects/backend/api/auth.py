from fastapi import Request, Header, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Optional
from algosdk.v2client.algod import AlgodClient
from db.supabase_client import supabase
from x402_custom.validator import X402Validator
from core.config import ALGOD_ADDRESS, ALGOD_TOKEN, EENDHAN_APP_ADDRESS, DEFAULT_ENDPOINT_ID

# Initialize Algorand Client and Validator
algod_client = AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
validator = X402Validator(algod_client, EENDHAN_APP_ADDRESS)

async def x402_payment_required(
    request: Request, 
    x_payment: Optional[str] = Header(None, alias="X-Payment")
):
    """
    Dependency that intercepts requests. 
    Returns 402 if no payment header. 
    Verifies payment if header exists.
    """
    # Hardcoded price for this example endpoint, normally fetched from DB based on request.url.path
    endpoint_price_usd = 0.01
    
    if not x_payment:
        # Get current status from Algorand
        status_info = algod_client.status()
        last_round = status_info.get("last-round", 0)
        
        import time
        expires_at = int(time.time()) + 60
        suggested_last_round = last_round + 20
        
        # Issue Challenge (returns 402 Payment Required)
        challenge = validator.issue_challenge(endpoint_price_usd, request.url.path, expires_at, suggested_last_round)
        
        # Save pending session — upsert endpoint first to satisfy FK constraint
        try:
            supabase.table("endpoints").upsert({
                "id": DEFAULT_ENDPOINT_ID,
                "path": request.url.path,
                "price_usd": endpoint_price_usd,
            }).execute()
            
            session_res = supabase.table("payment_sessions").insert({
                "endpoint_id": DEFAULT_ENDPOINT_ID,
                "consumer_wallet": "unknown_yet",
                "target_wallet": EENDHAN_APP_ADDRESS,
                "amount_algo": endpoint_price_usd,
                "nonce": challenge["x402"]["conditions"]["description"],
                "status": "pending",
                "expires_at": expires_at
            }).execute()
            
            challenge["sessionId"] = session_res.data[0]['id']
        except Exception as db_err:
            print(f"[WARN] DB session logging failed: {db_err}")
            import uuid
            challenge["sessionId"] = str(uuid.uuid4())
        
        return JSONResponse(status_code=402, content=challenge)
        
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
                session_data = supabase.table("payment_sessions").select("expires_at").eq("id", session_id).single().execute()
                if session_data.data:
                    import time
                    if int(time.time()) > session_data.data["expires_at"]:
                        raise HTTPException(status_code=402, detail="Session expired. Please request a new challenge.")
            except HTTPException:
                raise
            except Exception as e:
                print(f"[WARN] Could not check session expiration via DB (falling back to on-chain): {e}")

            result = validator.verify_payment(tx64, session_id, supabase)
            
            if not result["success"]:
                raise HTTPException(status_code=402, detail=result["error"])
                
            return result
        except Exception as e:
            if isinstance(e, HTTPException): raise e
            raise HTTPException(status_code=400, detail=f"Invalid X-Payment header format: {str(e)}")
