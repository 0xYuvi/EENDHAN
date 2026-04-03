from fastapi import APIRouter
from db.models import CreateEndpointReq
import uuid

router = APIRouter(prefix="/api/endpoints", tags=["endpoints"])

# Mock database
mock_endpoints = [
    {
        "endpointId": str(uuid.uuid4()),
        "creatorWallet": "MO2H6ZU47Q36GJ6GVHUKGECGVK5X2O6VDNVH24YOGL2Y7Y74XWDBQJ4Z6A",
        "title": "Premium Resume Reviewer",
        "priceAlgo": 1.5,
        "category": "Career"
    }
]

@router.post("/create")
async def create_endpoint(req: CreateEndpointReq):
    new_id = str(uuid.uuid4())
    mock_endpoints.append({
        "endpointId": new_id,
        "creatorWallet": req.creatorWallet,
        "title": req.title,
        "priceAlgo": req.priceAlgo,
        "category": req.category
    })
    return {
        "status": "success",
        "endpointId": new_id,
        "message": "Endpoint created successfully"
    }

@router.get("")
async def list_endpoints():
    return {"endpoints": mock_endpoints}
