from algopy import (
    ARC4Contract,
    Account,
    Asset,
    BoxMap,
    GlobalState,
    UInt64,
    Bytes,
    Global,
    Txn,
    gtxn,
    itxn,
    op,
)
from algopy.arc4 import abimethod

USDC_ASSET_ID = 10458941
PLATFORM_FEE_BASIS_POINTS = 500
TIMEOUT_ROUNDS = 30


class EscrowPortal(ARC4Contract):
    """
    Atomic Escrow Contract for AI API Payments.

    Flow:
    1. User locks funds via lock_funds()
    2. Backend calls settle_job() to release funds to creator + treasury
    3. If timeout passes, user can call force_refund()
    """

    def __init__(self) -> None:
        self.treasury_address = Account()
        self.backend_address = Account()
        self.usdc_asset = Asset(USDC_ASSET_ID)
        self.session_counter = GlobalState(UInt64, key="session_counter", description="Total sessions")
        self.sessions = BoxMap(Bytes, Bytes, key_prefix="session_")

    @abimethod(create="require")
    def create(self, treasury: Account, backend: Account) -> None:
        """Initialize contract with treasury and backend addresses."""
        self.treasury_address = treasury
        self.backend_address = backend
        self.session_counter.value = UInt64(0)

    @abimethod()
    def lock_funds(self, payment: gtxn.AssetTransferTransaction, session_id: Bytes) -> bool:
        """
        User locks USDC funds for a specific session.
        Payment must be sent to this contract in the same group.
        """
        assert payment.xfer_asset.id == UInt64(USDC_ASSET_ID), "Only USDC accepted"
        assert payment.asset_receiver == Global.current_application_address, "Payment must be to contract"
        assert payment.asset_amount > UInt64(0), "Amount must be positive"

        session_key = session_id
        assert session_key not in self.sessions, "Session already exists"

        self.sessions[session_key] = Bytes(f"locked:{payment.asset_amount}:{Txn.sender}:{Global.round}")
        return True

    @abimethod()
    def settle_job(self, session_id: Bytes, amount: UInt64, creator: Account) -> bool:
        """
        Backend calls to settle payment to creator.
        Splits: (100 - fee_basis_points)% to creator, rest to treasury.
        """
        assert op.Txn.sender == self.backend_address, "Only backend can settle"

        session_key = session_id
        assert session_key in self.sessions, "Session not found"

        session_data = self.sessions[session_key].bytes
        parts = session_data.split(b":")
        assert len(parts) >= 2, "Invalid session data"
        locked_amount = UInt64(int(parts[1]))

        assert amount <= locked_amount, "Settle amount exceeds locked"

        treasury_fee = (amount * UInt64(PLATFORM_FEE_BASIS_POINTS)) // UInt64(10000)
        creator_amount = amount - treasury_fee

        if treasury_fee > UInt64(0):
            itxn.AssetTransfer(
                xfer_asset=self.usdc_asset,
                asset_receiver=self.treasury_address,
                asset_amount=treasury_fee,
                fee=UInt64(0),
            ).submit()

        if creator_amount > UInt64(0):
            itxn.AssetTransfer(
                xfer_asset=self.usdc_asset,
                asset_receiver=creator,
                asset_amount=creator_amount,
                fee=UInt64(0),
            ).submit()

        del self.sessions[session_key]
        return True

    @abimethod()
    def force_refund(self, session_id: Bytes) -> UInt64:
        """
        User can call after timeout to get funds back.
        """
        session_key = session_id
        assert session_key in self.sessions, "Session not found"

        session_data = self.sessions[session_key].bytes
        parts = session_data.split(b":")
        assert len(parts) >= 3, "Invalid session data"

        locked_amount = UInt64(int(parts[1]))
        sender = Account(parts[2])

        if locked_amount > UInt64(0):
            itxn.AssetTransfer(
                xfer_asset=self.usdc_asset,
                asset_receiver=sender,
                asset_amount=locked_amount,
                fee=UInt64(0),
            ).submit()

        del self.sessions[session_key]
        return locked_amount

    @abimethod()
    def get_session_info(self, session_id: Bytes) -> Bytes:
        """Return session data for a given session ID."""
        session_key = session_id
        if session_key in self.sessions:
            return self.sessions[session_key]
        return Bytes(b"")

    @abimethod()
    def get_treasury(self) -> Account:
        return self.treasury_address

    @abimethod()
    def get_backend(self) -> Account:
        return self.backend_address
