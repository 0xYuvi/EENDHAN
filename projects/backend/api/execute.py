from fastapi import APIRouter, Depends, Request, HTTPException, status
from fastapi.responses import JSONResponse
import httpx
from api.auth import x402_payment_required

router = APIRouter(prefix="/api/execute", tags=["execute"])

@router.api_route("/{endpoint_id}", methods=["POST", "GET", "PUT", "PATCH", "DELETE"])
async def execute_dynamic_proxy(
    endpoint_id: str,
    request: Request,
    payment_info: dict = Depends(x402_payment_required)
):
    # If the middleware returned a challenge, passthrough
    if isinstance(payment_info, JSONResponse):
        return payment_info

    # Retrieve the dynamic endpoint configuration from the validated auth dependency
    endpoint_info = getattr(request.state, "endpoint_info", None)
    if not endpoint_info:
        raise HTTPException(status_code=500, detail="Missing endpoint configuration state")

    target_url = endpoint_info.get("target_url")
    method = endpoint_info.get("method", "POST").upper()

    if not target_url:
        raise HTTPException(status_code=500, detail="Target URL not configured for this endpoint")

    # Read the incoming request body
    body = await request.body()
    body_str = body.decode("utf-8", errors="ignore") if body else ""
    
    # We strip down the incoming headers we want to proxy, avoiding bad Host headers
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("content-length", None)
    
    # Add AlgoGate specific security headers so the creator knows it's verified
    headers["X-AlgoGate-Verified"] = "true"
    headers["X-AlgoGate-TxHash"] = payment_info.get("txid", "")
    headers["X-AlgoGate-Amount"] = str(payment_info.get("amount", ""))
    headers["X-AlgoGate-Consumer"] = payment_info.get("sender", "")

    # 1. Update State to Executing
    from db.supabase_client import supabase
    execution_id = getattr(request.state, "execution_id", None)
    if execution_id:
        try:
            import json
            req_json = json.loads(body_str) if body_str else None
            supabase.table("backend_executions").update({
                "status": "executing",
                "request_payload": req_json
            }).eq("execution_id", execution_id).execute()
        except:
            pass

    # Execute the generic httpx request towards the user's target URL with a Strict 30s Timeout
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            target_response = await client.request(
                method=method,
                url=target_url,
                headers=headers,
                content=body,
                params=request.query_params
            )
        except httpx.RequestError as e:
            # Hard timeout or connection failure -> Failed & Refund
            if execution_id:
                try:
                    supabase.table("backend_executions").update({
                        "status": "failed",
                        "refund_eligible": True,
                        "error_reason": f"Connection failed/Timeout: {str(e)}"
                    }).eq("execution_id", execution_id).execute()
                except:
                    pass
            
            return JSONResponse(
                status_code=status.HTTP_502_BAD_GATEWAY,
                content={
                    "status": "failed",
                    "refundEligible": True,
                    "reason": "Upstream API error"
                }
            )

    # 3. Check for 5xx Server Errors (Creator's fault -> Refund)
    if target_response.status_code >= 500:
        if execution_id:
            try:
                supabase.table("backend_executions").update({
                    "status": "failed",
                    "refund_eligible": True,
                    "error_reason": f"Upstream returned {target_response.status_code}",
                    "response_payload": {"raw_body": target_response.text}
                }).eq("execution_id", execution_id).execute()
            except:
                pass

        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "status": "failed",
                "refundEligible": True,
                "reason": "Upstream API error"
            }
        )

    # 4. Success (or 4xx client errors) -> Completed
    resp_json = None
    if "application/json" in target_response.headers.get("content-type", ""):
        try:
            resp_json = target_response.json()
        except:
            pass
            
    if execution_id:
        try:
            supabase.table("backend_executions").update({
                "status": "completed",
                "response_payload": resp_json if resp_json else {"raw_body": target_response.text}
            }).eq("execution_id", execution_id).execute()
        except:
            pass

    # Return the response mimicking the target's status code and headers
    return JSONResponse(
        content=resp_json if resp_json else target_response.text,
        status_code=target_response.status_code
    )
