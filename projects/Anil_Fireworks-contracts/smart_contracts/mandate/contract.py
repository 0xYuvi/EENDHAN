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
    itxn,
    op,
)
from algopy.arc4 import abimethod

USDC_ASSET_ID = 10458941
VELOCITY_WINDOW_ROUNDS = 20  # ~10 minutes (assuming 3s block time)
DAILY_ROUNDS = 28800  # ~24 hours


class Mandate(ARC4Contract):
    """
    Algorand AI Agentic Wallet - Mandate Contract

    Enforces spend limits at AVM level:
    - Per-transaction cap (max_txn_amount)
    - Velocity cap (max_velocity_amount per VELOCITY_WINDOW_ROUNDS)
    - Daily cap (max_daily_amount per DAILY_ROUNDS)

    Human operator deploys once with desired limits.
    AVM rejects anything exceeding the caps.
    """

    def __init__(self) -> None:
        self.owner = Account()
        self.usdc_asset = Asset(USDC_ASSET_ID)
        self.max_txn_amount = GlobalState(UInt64, key="max_txn", description="Per-txn cap")
        self.max_velocity_amount = GlobalState(UInt64, key="max_vel", description="10min cap")
        self.max_daily_amount = GlobalState(UInt64, key="max_daily", description="24hr cap")
        self.velocity_window = GlobalState(UInt64, key="vel_window", description="Velocity window rounds")
        self.daily_window = GlobalState(UInt64, key="daily_window", description="Daily window rounds")

        # Per-user mandates: user_address -> (velocity_amount, velocity_start, daily_amount, daily_start)
        self.user_mandates = BoxMap(Account, Bytes, key_prefix="mandate_")

    @abimethod(create="require")
    def create(
        self,
        owner: Account,
        max_txn: UInt64,
        max_velocity: UInt64,
        max_daily: UInt64,
    ) -> None:
        """Initialize mandate with spend limits."""
        self.owner = owner
        self.max_txn_amount.value = max_txn
        self.max_velocity_amount.value = max_velocity
        self.max_daily_amount.value = max_daily
        self.velocity_window.value = UInt64(VELOCITY_WINDOW_ROUNDS)
        self.daily_window.value = UInt64(DAILY_ROUNDS)

    @abimethod()
    def set_limits(
        self,
        max_txn: UInt64,
        max_velocity: UInt64,
        max_daily: UInt64,
    ) -> None:
        """Owner updates spend limits."""
        assert op.Txn.sender == self.owner, "Only owner can update limits"
        self.max_txn_amount.value = max_txn
        self.max_velocity_amount.value = max_velocity
        self.max_daily_amount.value = max_daily

    @abimethod()
    def create_mandate(self, user: Account) -> bool:
        """Create a new mandate for a user (requires prior payment)."""
        assert op.Txn.sender == self.owner, "Only owner can create mandates"
        assert user not in self.user_mandates, "Mandate already exists"

        # Format: velocity_amount:velocity_start:daily_amount:daily_start
        current_round = Global.round
        self.user_mandates[user] = Bytes(f"0:{current_round}:0:{current_round}")
        return True

    @abimethod()
    def revoke_mandate(self, user: Account) -> bool:
        """Owner revokes a mandate immediately."""
        assert op.Txn.sender == self.owner, "Only owner can revoke"
        if user in self.user_mandates:
            del self.user_mandates[user]
        return True

    @abimethod()
    def record_spend(self, user: Account, amount: UInt64) -> bool:
        """
        Record a spend and enforce caps.
        Called before any USDC transfer.
        """
        current_round = Global.round

        # Per-transaction cap
        assert amount <= self.max_txn_amount.value, "Exceeds per-txn cap"

        # Must have active mandate
        assert user in self.user_mandates, "No active mandate"

        mandate_data = self.user_mandates[user].bytes
        parts = mandate_data.split(b":")
        assert len(parts) >= 4, "Invalid mandate data"

        velocity_amount = UInt64(int(parts[0]))
        velocity_start = UInt64(int(parts[1]))
        daily_amount = UInt64(int(parts[2]))
        daily_start = UInt64(int(parts[3]))

        # Check velocity window reset
        if current_round >= velocity_start + self.velocity_window.value:
            velocity_amount = UInt64(0)
            velocity_start = current_round

        # Check daily window reset
        if current_round >= daily_start + self.daily_window.value:
            daily_amount = UInt64(0)
            daily_start = current_round

        # Enforce velocity cap
        assert amount + velocity_amount <= self.max_velocity_amount.value, "Exceeds velocity cap"

        # Enforce daily cap
        assert amount + daily_amount <= self.max_daily_amount.value, "Exceeds daily cap"

        # Update and store
        new_velocity = velocity_amount + amount
        new_daily = daily_amount + amount

        self.user_mandates[user] = Bytes(f"{new_velocity}:{velocity_start}:{new_daily}:{daily_start}")
        return True

    @abimethod()
    def get_mandate_info(self, user: Account) -> Bytes:
        """Return mandate data for a user."""
        if user in self.user_mandates:
            return self.user_mandates[user]
        return Bytes(b"")

    @abimethod()
    def get_limits(self) -> tuple[UInt64, UInt64, UInt64]:
        """Return current spend limits."""
        return (
            self.max_txn_amount.value,
            self.max_velocity_amount.value,
            self.max_daily_amount.value,
        )

    @abimethod()
    def get_owner(self) -> Account:
        return self.owner
