from algopy import (
    ARC4Contract,
    Account,
    Asset,
    Global,
    UInt64,
    gtxn,
    itxn,
    op,
)
from algopy.arc4 import abimethod

USDC_ASSET_ID = 10458941
PLATFORM_FEE_BASIS_POINTS = 500


class Eendhan(ARC4Contract):
    """
    AlgoGate AI - x402-powered AI API Gateway Contract.
    Handles USDC payment verification and payout splits.
    """

    def __init__(self) -> None:
        self.treasury_address = Account()
        self.creator_address = Account()
        self.usdc_asset = Asset()

    @abimethod(create="require")
    def create(self, treasury: Account, creator: Account) -> None:
        """
        Initialize contract with treasury and creator addresses.
        """
        self.treasury_address = treasury
        self.creator_address = creator
        self.usdc_asset = Asset(USDC_ASSET_ID)

    @abimethod()
    def opt_in_to_usdc(self) -> None:
        """
        Opt-in the application account to USDC.
        Strictly gated to creator address only.
        """
        assert op.Txn.sender == self.creator_address, "Only creator can opt in to assets"
        assert not op.Global.zero_address == self.creator_address, "Creator not set"

        itxn.AssetTransfer(
            xfer_asset=self.usdc_asset,
            asset_receiver=Global.current_application_address,
            asset_amount=UInt64(0),
            fee=UInt64(0),
        ).submit()

    @abimethod()
    def process_payment_split(self, payment: gtxn.AssetTransferTransaction) -> None:
        """
        Verify incoming USDC payment and split: 5% treasury, 95% creator.
        Payment must be sent to this contract's address in the same group.
        """
        assert payment.xfer_asset.id == UInt64(USDC_ASSET_ID), "Only USDC accepted"
        assert payment.asset_receiver == Global.current_application_address, "Payment must be sent to contract"
        assert payment.asset_amount > UInt64(0), "Payment amount must be positive"

        amount = payment.asset_amount
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
                asset_receiver=self.creator_address,
                asset_amount=creator_amount,
                fee=UInt64(0),
            ).submit()

    @abimethod()
    def update_treasury(self, new_treasury: Account) -> None:
        """
        Update the treasury address. Only creator can call.
        """
        assert op.Txn.sender == self.creator_address, "Only creator can update treasury"
        self.treasury_address = new_treasury

    @abimethod()
    def get_treasury(self) -> Account:
        """Return the current treasury address."""
        return self.treasury_address

    @abimethod()
    def get_creator(self) -> Account:
        """Return the current creator address."""
        return self.creator_address
