from fastapi import FastAPI, Depends, Request, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from typing import Optional
from pydantic import BaseModel
from ai_engine.inference import run_analyzer
from algosdk.v2client.algod import AlgodClient
from db.supabase_client import supabase
from x402_custom.validator import X402Validator

from api import endpoints
from api import x402

app = FastAPI(title="AlgoGate AI Backend", version="1.0.0")

# Set up CORS middleware to allow the frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, restrict to frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Validator for Middleware
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""
algod_client = AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
EENDHAN_APP_ADDRESS = "TPXCOJSONCOKFZDP76S2XR5HU4SISWOXUXFWRSOT2HL3V7TYRCZD7BXWYY"
validator = X402Validator(algod_client, EENDHAN_APP_ADDRESS)

# --- x402 Middleware / Dependency ---
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
        # Issue Challenge (returns 402 Payment Required)
        challenge = validator.issue_challenge(endpoint_price_usd, request.url.path)
        
        # Save pending session — upsert endpoint first to satisfy FK constraint
        try:
            ENDPOINT_ID = "00000000-0000-0000-0000-000000000001"
            supabase.table("endpoints").upsert({
                "id": ENDPOINT_ID,
                "path": request.url.path,
                "price_usd": endpoint_price_usd,
            }).execute()
            
            session_res = supabase.table("payment_sessions").insert({
                "endpoint_id": ENDPOINT_ID,
                "consumer_wallet": "unknown_yet",
                "target_wallet": EENDHAN_APP_ADDRESS,
                "amount_algo": endpoint_price_usd,
                "nonce": challenge["x402"]["conditions"]["description"],
                "status": "pending"
            }).execute()
            
            challenge["sessionId"] = session_res.data[0]['id']
        except Exception as db_err:
            # DB logging failure should not block the 402 challenge
            print(f"[WARN] DB session logging failed: {db_err}")
            challenge["sessionId"] = "no-session"
        
        # Return 402 Payment Required
        return JSONResponse(status_code=402, content=challenge)
        
    else:
        # X-Payment header is present, it should strictly contain transaction ID and session ID 
        # Format: "txid=<tx_hash>, session=<session_id>" 
        # For simplicity, we assume the client sends the TxHash and Session ID correctly formatted or as a base64 string
        try:
            parts = {}
            for item in x_payment.split(","):
                key, val = item.split("=", 1)
                parts[key.strip()] = val.strip()
            
            tx64 = parts.get("tx64", "").strip()
            session_id = parts.get("session", "").strip()
            
            result = validator.verify_payment(tx64, session_id, supabase)
            
            if not result["success"]:
                raise HTTPException(status_code=402, detail=result["error"])
                
            # Payment Verified!
            return result
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid X-Payment header format: {str(e)}")

# Include Routers
app.include_router(endpoints.router)
app.include_router(x402.router)

@app.get("/")
async def root():
    return {"message": "AlgoGate AI Backend API is running. See /docs for endpoints."}

class ResumeRequest(BaseModel):
    resume_text: str

# Premium Endpoint Example
@app.post("/api/ai/premium-endpoint")
async def premium_ai_service(body: ResumeRequest, request: Request, payment_info: dict = Depends(x402_payment_required)):
    # If the execution reaches here, the middleware successfully verified the payment.
    
    if isinstance(payment_info, JSONResponse):
        return payment_info # This means it returned a 402 challenge

    # Run the real AI engine
    try:
        ai_output = run_analyzer(body.resume_text)
    except Exception as e:
        ai_output = {"error": str(e)}

    return {
        "status": "success",
        "message": "Welcome to the premium AI service! Your payment was verified.",
        "payment_details": payment_info,
        "ai_output": ai_output
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
