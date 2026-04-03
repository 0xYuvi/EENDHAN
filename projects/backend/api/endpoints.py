from fastapi import APIRouter, HTTPException, status
from db.models import CreateEndpointReq
from db.supabase_client import supabase

router = APIRouter(prefix="/api/endpoints", tags=["endpoints"])

@router.post("/create")
async def create_endpoint(req: CreateEndpointReq):
    try:
        data, count = supabase.table("endpoints").insert({
            "creator_wallet": req.creatorWallet,
            "title": req.title,
            "price_algo": req.priceAlgo,
            "system_prompt": req.systemPrompt,
            "category": req.category
        }).execute()
        
        if len(data[1]) == 0:
            raise Exception("No data returned from DB")
            
        endpoint_id = data[1][0]['id']
        return {
            "status": "success",
            "endpointId": endpoint_id,
            "message": "Endpoint created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("")
async def list_endpoints():
    try:
        data, count = supabase.table("endpoints").select("*").execute()
        
        # Format snake_case to camelCase mapping for the API contract
        formatted_endpoints = []
        for row in data[1]:
            formatted_endpoints.append({
                "endpointId": row["id"],
                "creatorWallet": row["creator_wallet"],
                "title": row["title"],
                "priceAlgo": float(row["price_algo"]),
                "category": row["category"]
            })
            
        return {"endpoints": formatted_endpoints}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
