from fastapi import APIRouter, Depends, Request, HTTPException, status
from fastapi.responses import JSONResponse, Response
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

    # Sanitize headers
    headers = {}
    allowed_headers = ["content-type", "accept", "user-agent", "authorization"]
    for k, v in request.headers.items():
        if k.lower() in allowed_headers:
            headers[k] = v
            
    # Add AlgoGate proofs
    headers["X-AlgoGate-Verified"] = "true"
    headers["X-AlgoGate-TxHash"] = payment_info.get("txid", "")
    headers["X-AlgoGate-Amount"] = str(payment_info.get("amount", ""))
    headers["X-AlgoGate-Consumer"] = payment_info.get("sender", "")
    headers["User-Agent"] = "AlgoGate-Proxy/1.0"

    if execution_id:
        try:
            supabase.table("backend_executions").update({"status": "executing"}).eq(
                "execution_id", execution_id
            ).execute()
        except:
            pass

    import json as json_lib
    import random
    import time

    # For GET-based upstreams: append prompt to URL, don't send a body
    upstream_body: bytes | None = body
    upstream_params = dict(request.query_params)
    
    # Global cache busting
    upstream_params["_t"] = str(int(time.time() * 1000))

    if method == "GET" and body:
        try:
            parsed = json_lib.loads(body)
            
            # Auto-seed for Pollinations if not provided to prevent duplicate images
            if "pollinations.ai" in target_url and "seed" not in parsed:
                parsed["seed"] = random.randint(1, 999999999)

            # Try common prompt field names — prompt, query, text, q, input
            for key in ["prompt", "query", "text", "q", "input"]:
                if key in parsed:
                    prompt_value = str(parsed[key])
                    # Append to URL path if it ends with /
                    if target_url.rstrip("/").endswith("/prompt") or target_url.endswith("/"):
                        url_prompt = prompt_value.replace(" ", "%20")
                        target_url = target_url.rstrip("/") + "/" + url_prompt
                    else:
                        upstream_params["prompt"] = prompt_value
                    
                    # Carry over other fields as params (like seed)
                    for k, v in parsed.items():
                        if k != key:
                            upstream_params[k] = str(v)
                            
                    upstream_body = None
                    break
            else:
                # No known prompt key; fall back to using all fields as query params
                for k, v in parsed.items():
                    upstream_params[k] = str(v)
                upstream_body = None
        except Exception:
            upstream_body = None  # GET can't have a body

    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        try:
            target_response = await client.request(
                method=method,
                url=target_url,
                headers=headers,
                content=upstream_body if method != "GET" else None,
                params=upstream_params,
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
                    "reason": "Upstream connection failed",
                    "detail": str(e)
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
                "reason": f"Upstream returned {target_response.status_code}",
                "detail": target_response.text[:200]
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
                    "response_payload": resp_json if resp_json else {"raw_body": "binary/text format"},
                }
            ).eq("execution_id", execution_id).execute()
        except:
            pass

    if resp_json is not None:
        return JSONResponse(
            content=resp_json,
            status_code=target_response.status_code,
        )

    return Response(
        content=target_response.content,
        status_code=target_response.status_code,
        media_type=target_response.headers.get("content-type", "text/plain"),
    )
