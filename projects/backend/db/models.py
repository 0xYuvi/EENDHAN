from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID, uuid4

class User(BaseModel):
    id: UUID = uuid4()
    wallet_address: str
    created_at: datetime = datetime.now()

class Endpoint(BaseModel):
    id: str
    creator_wallet: str
    title: str
    description: Optional[str] = None
    price_usdc: float
    target_url: str
    method: str = "POST"
    created_at: datetime = datetime.now()

class PaymentSession(BaseModel):
    id: UUID = uuid4()
    endpoint_id: str
    consumer_wallet: str
    target_wallet: str
    amount_usdc: float
    nonce: str
    status: str = "pending" # "pending", "completed", "failed"
    created_at: datetime = datetime.now()

class UsageLog(BaseModel):
    id: UUID = uuid4()
    session_id: UUID
    consumer_wallet: str
    endpoint_id: str
    input_text: str
    output_text: str
    tx_hash: str
    created_at: datetime = datetime.now()

# DTOs for requests and responses
class CreateEndpointReq(BaseModel):
    endpointId: str
    creatorWallet: str
    title: str
    description: Optional[str] = None
    priceUsdc: float
    targetUrl: str
    method: Optional[str] = "POST"

class X402ChallengeReq(BaseModel):
    consumerWallet: str
    endpointId: str

class X402VerifyReq(BaseModel):
    sessionId: str
    txHash: str
    consumerInput: str

class BackendExecution(BaseModel):
    execution_id: UUID = uuid4()
    session_id: UUID
    endpoint_id: str
    status: str
    refund_eligible: bool = False
    request_payload: Optional[dict] = None
    response_payload: Optional[dict] = None
    error_reason: Optional[str] = None
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()
