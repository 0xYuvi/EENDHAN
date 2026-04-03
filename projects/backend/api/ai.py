from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from ai_engine.inference import run_analyzer
from api.auth import x402_payment_required
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/ai", tags=["ai"])

class ResumeRequest(BaseModel):
    resume_text: str

@router.post("/premium-endpoint")
async def premium_ai_service(
    body: ResumeRequest, 
    request: Request, 
    payment_info: dict = Depends(x402_payment_required)
):
    # If the middleware returned a challenge, passthrough
    if isinstance(payment_info, JSONResponse):
        return payment_info

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
