from fastapi import APIRouter, HTTPException, status
from db.models import CreateEndpointReq
from db.supabase_client import supabase

router = APIRouter(prefix="/api/endpoints", tags=["endpoints"])


@router.post("/create")
async def create_endpoint(req: CreateEndpointReq):
    try:
        data, count = (
            supabase.table("endpoints")
            .insert(
                {
                    "id": req.endpointId,
                    "creator_wallet": req.creatorWallet,
                    "title": req.title,
                    "description": req.description,
                    "price_usdc": req.priceUsdc,
                    "pricing_tiers": req.pricingTiers,
                    "target_url": req.targetUrl,
                    "method": req.method,
                }
            )
            .execute()
        )

        if len(data[1]) == 0:
            raise Exception("No data returned from DB")

        endpoint_id = data[1][0]["id"]
        return {
            "status": "success",
            "endpointId": endpoint_id,
            "message": "Endpoint created successfully",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("")
async def list_endpoints():
    try:
        data, count = supabase.table("endpoints").select("*").execute()

        # Format snake_case to camelCase mapping for the API contract
        formatted_endpoints = []
        for row in data[1]:
            formatted_endpoints.append(
                {
                    "endpointId": row["id"],
                    "creatorWallet": row.get("creator_wallet"),
                    "title": row.get("title"),
                    "description": row.get("description"),
                    "priceUsdc": float(row.get("price_usdc", 0.0)),
                    "pricingTiers": row.get("pricing_tiers"),
                    "targetUrl": row.get("target_url"),
                    "method": row.get("method"),
                }
            )

        return {"endpoints": formatted_endpoints}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

@router.get("/{endpoint_id}")
async def get_endpoint(endpoint_id: str):
    try:
        data = supabase.table("endpoints").select("*").eq("id", endpoint_id).execute()
        if not data.data or len(data.data) == 0:
            raise HTTPException(status_code=404, detail="Endpoint not found")
            
        row = data.data[0]
        return {
            "endpointId": row["id"],
            "creatorWallet": row.get("creator_wallet"),
            "title": row.get("title"),
            "description": row.get("description"),
            "priceUsdc": float(row.get("price_usdc", 0.0)),
            "pricingTiers": row.get("pricing_tiers"),
            "targetUrl": row.get("target_url"),
            "method": row.get("method"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
