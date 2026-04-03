from fastapi import APIRouter, HTTPException, status
from db.models import X402ChallengeReq, X402VerifyReq
import uuid

router = APIRouter(prefix="/api/x402", tags=["x402"])

# Simple mock database for sessions pending verification
pending_sessions = {}

@router.post("/challenge")
async def x402_challenge(req: X402ChallengeReq):
    session_id = str(uuid.uuid4())
    nonce = uuid.uuid4().hex
    # Mocking endpoint lookup
    amount_algo = 1.5
    target_wallet = "MO2H6ZU47Q36GJ6GVHUKGECGVK5X2O6VDNVH24YOGL2Y7Y74XWDBQJ4Z6A"
    
    pending_sessions[session_id] = {
        "endpointId": req.endpointId,
        "consumerWallet": req.consumerWallet,
        "targetWallet": target_wallet,
        "amountAlgo": amount_algo,
        "nonce": nonce
    }

    # Typically an HTTP 402 is returned, but we return a standard JSON for ease of client consumption based on the contract
    return {
        "sessionId": session_id,
        "amountAlgo": amount_algo,
        "targetWallet": target_wallet,
        "nonce": nonce,
        "message": "Payment Required"
    }

@router.post("/verify")
async def x402_verify(req: X402VerifyReq):
    if req.sessionId not in pending_sessions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired session")
    
    # Mocking successful transaction verification
    if req.txHash == "invalid":
        return {
            "status": "error",
            "message": "Transaction verification failed or expired"
        }
    
    # Clean up session
    del pending_sessions[req.sessionId]

    # Mocking AI inference outcome
    ai_output = f"Mocked Resume Review: Your resume is good, but needs more quantifiable metrics. Rated 75/100."
    return {
        "status": "success",
        "aiOutput": ai_output
    }
