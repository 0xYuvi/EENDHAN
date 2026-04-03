from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID, uuid4

class User(BaseModel):
    id: UUID = uuid4()
    wallet_address: str
    created_at: datetime = datetime.now()

class Endpoint(BaseModel):
    id: UUID = uuid4()
    creator_wallet: str
    title: str
    price_algo: float
    system_prompt: str
    category: str
    created_at: datetime = datetime.now()

class PaymentSession(BaseModel):
    id: UUID = uuid4()
    endpoint_id: UUID
    consumer_wallet: str
    target_wallet: str
    amount_algo: float
    nonce: str
    status: str = "pending" # "pending", "completed", "failed"
    created_at: datetime = datetime.now()

class UsageLog(BaseModel):
    id: UUID = uuid4()
    session_id: UUID
    consumer_wallet: str
    endpoint_id: UUID
    input_text: str
    output_text: str
    tx_hash: str
    created_at: datetime = datetime.now()

# DTOs for requests and responses
class CreateEndpointReq(BaseModel):
    creatorWallet: str
    title: str
    priceAlgo: float
    systemPrompt: str
    category: str

class X402ChallengeReq(BaseModel):
    consumerWallet: str
    endpointId: str

class X402VerifyReq(BaseModel):
    sessionId: str
    txHash: str
    consumerInput: str

