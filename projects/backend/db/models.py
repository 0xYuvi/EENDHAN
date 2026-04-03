from pydantic import BaseModel
from typing import Optional, Dict
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
    pricing_tiers: Optional[Dict[str, int]] = None
    target_url: str
    method: str = "POST"
    created_at: datetime = datetime.now()


class PaymentSession(BaseModel):
    id: UUID = uuid4()
    endpoint_id: str
    consumer_wallet: str
    target_wallet: str
    amount_usdc: float
    tier: str = "basic"
    nonce: str
    status: str = "pending"
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


class CreateEndpointReq(BaseModel):
    endpointId: str
    creatorWallet: str
    title: str
    description: Optional[str] = None
    priceUsdc: float
    pricingTiers: Optional[Dict[str, int]] = None
    targetUrl: str
    method: Optional[str] = "POST"


class X402ChallengeReq(BaseModel):
    consumerWallet: str
    endpointId: str
    tier: Optional[str] = "basic"


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
    settle_txn_id: Optional[str] = None
    settle_error: Optional[str] = None
    request_payload: Optional[dict] = None
    response_payload: Optional[dict] = None
    error_reason: Optional[str] = None
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()


class SettlementResponse(BaseModel):
    status: str
    txnId: Optional[str] = None
    confirmedRound: Optional[int] = None
    error: Optional[str] = None


class Mandate(BaseModel):
    id: UUID = uuid4()
    agent_id: str
    max_txn_amount: int
    max_velocity_amount: int
    max_daily_amount: int
    status: str = "active"
    created_at: datetime = datetime.now()
    revoked_at: Optional[datetime] = None


class CreateMandateReq(BaseModel):
    maxTxn: int = 10_000_000
    maxVelocity: int = 50_000_000
    maxDaily: int = 500_000_000


class ApprovalToken(BaseModel):
    id: UUID = uuid4()
    token: str
    agent_id: str
    expires_at: datetime
    used: bool = False
    created_at: datetime = datetime.now()


class MandateResponse(BaseModel):
    mandateId: str
    status: str
    limits: Dict[str, int]


class VelocityCapResponse(BaseModel):
    velocityCapped: bool
    currentSpend: Optional[int] = None
    limit: Optional[int] = None
    windowSeconds: Optional[int] = None
