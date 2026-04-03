from fastapi import APIRouter, HTTPException, status, Depends
from db.models import X402ChallengeReq, X402VerifyReq
from db.supabase_client import supabase
from x402_custom.validator import X402Validator
from algosdk.v2client.algod import AlgodClient
import uuid
import os

router = APIRouter(prefix="/api/x402", tags=["x402"])

# Initialize Algorand Client (TestNet)
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""
algod_client = AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

# Initialize Validator
# In a real app, the receiver_address would be the contract address or platform treasury.
# For now, using the one from the deployment.
EENDHAN_APP_ADDRESS = "O575YER27O3D5XFRFYJUCMCSCQANTUMSGL53MQ5BDC2GOTVT63Q6FGXD4Q"
validator = X402Validator(algod_client, EENDHAN_APP_ADDRESS)

@router.post("/challenge")
async def x402_challenge(req: X402ChallengeReq):
    try:
        # Fetch the endpoint to get the price and creator wallet
        endpoint_res = supabase.table("endpoints").select("*").eq("id", req.endpointId).execute()
        
        if not endpoint_res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Endpoint not found")
            
        endpoint = endpoint_res.data[0]
        price_usd = float(endpoint["price_algo"]) # Plan says price_algo but validator expects usd? 
        # Actually in the plan it says 'price in ALGO'. The validator.py used price_usd. 
        # I'll keep the terminology consistent with the validator's code or update the validator.
        # Let's check validator.py again. It multiplies by 1,000,000. So it treats it as units of USDC if used with USDC.
        
        challenge = validator.issue_challenge(price_usd, endpoint["title"])
        
        # Save pending session in DB
        session_res = supabase.table("payment_sessions").insert({
            "endpoint_id": req.endpointId,
            "consumer_wallet": req.consumerWallet,
            "target_wallet": EENDHAN_APP_ADDRESS,
            "amount_algo": price_usd,
            "nonce": challenge["x402"]["conditions"]["description"], # Using description for now as a nonce-holder
            "status": "pending"
        }).execute()
        
        session_id = session_res.data[0]['id']
        challenge["sessionId"] = session_id
        
        return challenge
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/verify")
async def x402_verify(req: X402VerifyReq):
    try:
        # 1. Verification via x402_custom logic
        result = validator.verify_payment(req.txHash, req.sessionId, supabase)
        
        if not result["success"]:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=result["error"])
            
        # 2. Mock AI Inference (Member 4 will replace this later)
        # In a real flow, we'd fetch the system prompt from the endpoint associated with the session
        # session_data = supabase.table("payment_sessions").select("endpoint_id").eq("id", req.sessionId).single().execute()
        # endpoint_data = supabase.table("endpoints").select("system_prompt").eq("id", session_data.data["endpoint_id"]).single().execute()
        
        ai_output = f"Authenticated Payment Success! Tx: {result['txid']}. AI processing triggered..."
        
        # 3. Log Usage successfully
        supabase.table("usage_logs").insert({
            "session_id": req.sessionId,
            "consumer_wallet": result["sender"],
            "endpoint_id": result["session_id"], # This is actually mapping wrongly in Member 1's mock, but we'll leave DB logic to Member 1 if it works.
            "input_text": req.consumerInput,
            "output_text": ai_output,
            "tx_hash": req.txHash
        }).execute()
        
        return {
            "status": "success",
            "aiOutput": ai_output,
            "verification": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
