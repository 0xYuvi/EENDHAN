from fastapi import APIRouter, HTTPException, status
from db.models import X402ChallengeReq, X402VerifyReq
from db.supabase_client import supabase
import uuid

router = APIRouter(prefix="/api/x402", tags=["x402"])

@router.post("/challenge")
async def x402_challenge(req: X402ChallengeReq):
    try:
        # Fetch the endpoint to get the price and creator wallet
        endpoint_data, count = supabase.table("endpoints").select("*").eq("id", req.endpointId).execute()
        
        if len(endpoint_data[1]) == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Endpoint not found")
            
        endpoint = endpoint_data[1][0]
        amount_algo = float(endpoint["price_algo"])
        target_wallet = endpoint["creator_wallet"]
        
        nonce = uuid.uuid4().hex
        
        # Save pending session in DB
        session_data, count = supabase.table("payment_sessions").insert({
            "endpoint_id": req.endpointId,
            "consumer_wallet": req.consumerWallet,
            "target_wallet": target_wallet,
            "amount_algo": amount_algo,
            "nonce": nonce,
            "status": "pending"
        }).execute()
        
        session_id = session_data[1][0]['id']
        
        return {
            "sessionId": session_id,
            "amountAlgo": amount_algo,
            "targetWallet": target_wallet,
            "nonce": nonce,
            "message": "Payment Required"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/verify")
async def x402_verify(req: X402VerifyReq):
    try:
        # 1. Look up the session
        session_data, count = supabase.table("payment_sessions").select("*").eq("id", req.sessionId).execute()
        
        if len(session_data[1]) == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session ID")
            
        session = session_data[1][0]
        
        if session["status"] != "pending":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session already processed")
            
        # 2. Mocking Blockchain Verification (Member 3 will replace this later)
        if req.txHash == "invalid":
            return {
                "status": "error",
                "message": "Transaction verification failed"
            }
            
        # 3. Mark session complete
        supabase.table("payment_sessions").update({"status": "completed"}).eq("id", req.sessionId).execute()
        
        # 4. Mock AI Inference (Member 4 will replace this later)
        ai_output = f"Mocked Resume Review: Rated 75/100 based on '{req.consumerInput[:20]}...'"
        
        # 5. Log Usage successfully
        supabase.table("usage_logs").insert({
            "session_id": req.sessionId,
            "consumer_wallet": session["consumer_wallet"],
            "endpoint_id": session["endpoint_id"],
            "input_text": req.consumerInput,
            "output_text": ai_output,
            "tx_hash": req.txHash
        }).execute()
        
        return {
            "status": "success",
            "aiOutput": ai_output
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
