from fastapi import APIRouter, Depends, Request, HTTPException, status
from fastapi.responses import JSONResponse
import httpx
from api.auth import x402_payment_required
from core.config import EENDHAN_APP_ADDRESS
from db.supabase_client import supabase

router = APIRouter(prefix="/api/execute", tags=["execute"])


@router.api_route("/{endpoint_id}", methods=["POST", "GET", "PUT", "PATCH", "DELETE"])
async def execute_dynamic_proxy(
    endpoint_id: str,
    request: Request,
    payment_info: dict = Depends(x402_payment_required),
):
    if isinstance(payment_info, JSONResponse):
        return payment_info

    endpoint_info = getattr(request.state, "endpoint_info", None)
    if not endpoint_info:
        raise HTTPException(
            status_code=500, detail="Missing endpoint configuration state"
        )

    target_url = endpoint_info.get("target_url")
    method = endpoint_info.get("method", "POST").upper()

    if not target_url:
        raise HTTPException(
            status_code=500, detail="Target URL not configured for this endpoint"
        )

    creator_wallet = endpoint_info.get("creator_wallet", EENDHAN_APP_ADDRESS)

    execution_id = getattr(request.state, "execution_id", None)

    body = await request.body()
    body_str = body.decode("utf-8", errors="ignore") if body else ""

    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("content-length", None)

    headers["X-AlgoGate-Verified"] = "true"
    headers["X-AlgoGate-TxHash"] = payment_info.get("txid", "")
    headers["X-AlgoGate-Amount"] = str(payment_info.get("amount", ""))
    headers["X-AlgoGate-Consumer"] = payment_info.get("sender", "")

    if execution_id:
        try:
            supabase.table("backend_executions").update({"status": "executing"}).eq(
                "execution_id", execution_id
            ).execute()
        except:
            pass

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            target_response = await client.request(
                method=method,
                url=target_url,
                headers=headers,
                content=body,
                params=request.query_params,
            )
        except httpx.RequestError as e:
            if execution_id:
                try:
                    supabase.table("backend_executions").update(
                        {
                            "status": "failed",
                            "refund_eligible": True,
                            "error_reason": f"Connection failed/Timeout: {str(e)}",
                        }
                    ).eq("execution_id", execution_id).execute()
                except:
                    pass

            return JSONResponse(
                status_code=status.HTTP_502_BAD_GATEWAY,
                content={
                    "status": "failed",
                    "refundEligible": True,
                    "reason": "Upstream API error",
                },
            )

    if target_response.status_code >= 500:
        if execution_id:
            try:
                supabase.table("backend_executions").update(
                    {
                        "status": "failed",
                        "refund_eligible": True,
                        "error_reason": f"Upstream returned {target_response.status_code}",
                        "response_payload": {"raw_body": target_response.text},
                    }
                ).eq("execution_id", execution_id).execute()
            except:
                pass

        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "status": "failed",
                "refundEligible": True,
                "reason": "Upstream API error",
            },
        )

    resp_json = None
    if "application/json" in target_response.headers.get("content-type", ""):
        try:
            resp_json = target_response.json()
        except:
            pass

    if execution_id:
        try:
            supabase.table("backend_executions").update(
                {
                    "status": "completed",
                    "response_payload": resp_json
                    if resp_json
                    else {"raw_body": target_response.text},
                }
            ).eq("execution_id", execution_id).execute()
        except:
            pass

    return JSONResponse(
        content=resp_json if resp_json else target_response.text,
        status_code=target_response.status_code,
    )
