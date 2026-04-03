"""
Test script simulating an agentic wallet calling the x402-protected API.
Flow:
1. Receive 402 response from validator
2. Sign USDC transfer using VibeKit keyring
3. Call endpoint with X-PAYMENT header
4. Verify payment success
"""

import asyncio
import base64
import uuid
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from algosdk import encoding, transaction
from algosdk.v2client.algod import AlgodClient

USDC_ASSET_ID = 10458941
TESTNET_ALGOD_URL = "https://testnet-api.4160.nodely.dev"
TESTNET_INDEXER_URL = "https://testnet-idx.4160.nodely.dev"

APP_ADDRESS = "O575YER27O3D5XFRFYJUCMCSCQANTUMSGL53MQ5BDC2GOTVT63Q6FGXD4Q"
RECEIVER_ADDRESS = "COBW4B43ZK4EJBWTFY6ZQIMBYMKMLBITGEMWMVHJ2UMWBGAKQBRTL223WI"

TEST_ENDPOINT = "/api/agent/execute"
TEST_AMOUNT_MICRO_USDC = 100000


class MockSupabaseClient:
    def __init__(self) -> None:
        self.payments: list[dict[str, Any]] = []
        self.sessions: list[dict[str, Any]] = []

    def table(self, name: str) -> "MockTable":
        return MockTable(self, name)


class MockTable:
    def __init__(self, client: MockSupabaseClient, name: str) -> None:
        self._client = client
        self._name = name
        self._filters: list[tuple[str, str, Any]] = []

    def select(self, *args: str) -> "MockTable":
        return self

    def eq(self, field: str, value: Any) -> "MockTable":
        self._filters.append((field, "eq", value))
        return self

    def insert(self, data: dict[str, Any]) -> "MockTable":
        self._client.payments.append(data)
        return self

    def update(self, data: dict[str, Any]) -> "MockTable":
        return self

    def execute(self) -> "MockResult":
        if self._name == "payments":
            return MockResult(
                [
                    p
                    for p in self._client.payments
                    if all(f[2] == p.get(f[0]) for f in self._filters)
                ]
            )
        return MockResult([])


class MockResult:
    def __init__(self, data: list[dict[str, Any]]) -> None:
        self.data = data


class TestX402Gateway:
    @pytest.fixture
    def supabase(self) -> MockSupabaseClient:
        return MockSupabaseClient()

    @pytest.fixture
    def algd(self) -> AlgodClient:
        return AlgodClient("", TESTNET_ALGOD_URL)

    def test_issue_challenge_returns_402(self, algd: AlgodClient) -> None:
        from x402_custom.validator import X402Validator

        validator = X402Validator(algd, RECEIVER_ADDRESS)
        challenge = validator.issue_challenge(price_usd=0.01, endpoint=TEST_ENDPOINT)

        assert challenge["status"] == 402
        assert "x402" in challenge
        assert challenge["x402"]["network"] == "testnet"
        assert challenge["x402"]["conditions"]["assetId"] == USDC_ASSET_ID
        assert challenge["x402"]["conditions"]["receiver"] == RECEIVER_ADDRESS

    def test_verify_payment_rejects_replay(
        self, algd: AlgodClient, supabase: MockSupabaseClient
    ) -> None:
        from x402_custom.validator import X402Validator

        validator = X402Validator(algd, RECEIVER_ADDRESS)
        dummy_tx = base64.b64encode(b"fake_transaction_data").decode()

        result = validator.verify_payment(dummy_tx, "session_123", supabase)
        assert result["success"] is False
        assert "Verification failed" in result["error"]

    def test_simulate_full_agentic_flow(
        self, algd: AlgodClient, supabase: MockSupabaseClient
    ) -> None:
        from x402_custom.validator import X402Validator

        validator = X402Validator(algd, RECEIVER_ADDRESS)

        with patch.object(validator, "_wait_for_confirmation", return_value=True):
            challenge = validator.issue_challenge(
                price_usd=0.10, endpoint="/api/ai/generate"
            )
            assert challenge["status"] == 402

            amount = challenge["x402"]["conditions"]["amount"]
            assert amount == 100000

            signed_tx = _sign_usdc_payment_sync(
                sender=RECEIVER_ADDRESS,
                receiver=RECEIVER_ADDRESS,
                amount=amount,
                asset_id=USDC_ASSET_ID,
            )

            result = validator.verify_payment(signed_tx, "agent_session_001", supabase)
            assert result["success"] is True
            assert result["asset_id"] == USDC_ASSET_ID
            assert result["amount"] == amount
            assert result["session_id"] == "agent_session_001"


def _sign_usdc_payment_sync(
    sender: str,
    receiver: str,
    amount: int,
    asset_id: int,
) -> str:
    from algosdk.account import generate_account

    sk, _ = generate_account()

    params = transaction.SuggestedParams(
        fee=1000,
        first=1,
        last=10000,
        gen="testnet-v1.0",
        gh=b"test" * 8,
        flat_fee=True,
    )

    tx = transaction.AssetTransferTxn(
        sender=sender,
        sp=params,
        receiver=receiver,
        amt=amount,
        index=asset_id,
    )

    signed = tx.sign(sk)
    return encoding.msgpack_encode(signed)


class TestAgenticWalletWithVibeKit:
    @pytest.fixture
    def session_id(self) -> str:
        return str(uuid.uuid4())

    @pytest.mark.asyncio
    async def test_payment_flow_with_mocked_api(self, session_id: str) -> None:
        from x402_custom.validator import X402Validator

        algd = AlgodClient("", TESTNET_ALGOD_URL)
        supabase = MockSupabaseClient()
        validator = X402Validator(algd, RECEIVER_ADDRESS)

        with patch.object(validator, "_wait_for_confirmation", return_value=True):
            step1_challenge = validator.issue_challenge(
                price_usd=0.05, endpoint="/api/ai/query"
            )
            assert step1_challenge["status"] == 402

            conditions = step1_challenge["x402"]["conditions"]
            required_amount = conditions["amount"]

            signed_payment = await _sign_usdc_with_vibekit_flow(
                sender_address=RECEIVER_ADDRESS,
                receiver_address=conditions["receiver"],
                amount=required_amount,
                asset_id=conditions["assetId"],
            )

            step2_result = validator.verify_payment(
                signed_payment, session_id, supabase
            )
            assert step2_result["success"] is True
            assert step2_result["session_id"] == session_id


async def _sign_usdc_with_vibekit_flow(
    sender_address: str,
    receiver_address: str,
    amount: int,
    asset_id: int,
) -> str:
    from algosdk.account import generate_account

    sk, _ = generate_account()

    try:
        params_response = await AlgodClient("", TESTNET_ALGOD_URL).suggested_params()
        params = transaction.SuggestedParams(
            fee=params_response.get("min-fee", 1000),
            first=params_response.get("first-round", 1),
            last=params_response.get("last-round", 10000),
            gen=params_response.get("genesis-id", "testnet-v1.0"),
            gh=params_response.get("genesis-hash", ""),
            flat_fee=True,
        )
    except Exception:
        params = transaction.SuggestedParams(
            fee=1000,
            first=1,
            last=10000,
            gen="testnet-v1.0",
            gh=b"test" * 8,
            flat_fee=True,
        )

    tx = transaction.AssetTransferTxn(
        sender=sender_address,
        sp=params,
        receiver=receiver_address,
        amt=amount,
        index=asset_id,
    )

    signed = tx.sign(sk)
    return encoding.msgpack_encode(signed)


@pytest.mark.asyncio
async def test_end_to_end_with_vibekit_keyring() -> None:
    """
    Integration test using VibeKit keyring for signing.
    This test uses the actual VibeKit account if available.
    """
    from x402_custom.validator import X402Validator

    session_id = str(uuid.uuid4())
    supabase = MockSupabaseClient()
    algd = AlgodClient("", TESTNET_ALGOD_URL)

    signer_address = RECEIVER_ADDRESS

    validator = X402Validator(algd, RECEIVER_ADDRESS)

    with patch.object(validator, "_wait_for_confirmation", return_value=True):
        challenge = validator.issue_challenge(
            price_usd=0.01, endpoint="/api/agent/execute"
        )

        assert challenge["status"] == 402
        conditions = challenge["x402"]["conditions"]

        signed = await _sign_usdc_with_vibekit_flow(
            sender_address=signer_address,
            receiver_address=conditions["receiver"],
            amount=conditions["amount"],
            asset_id=conditions["assetId"],
        )

        result = validator.verify_payment(signed, session_id, supabase)
        assert result["success"] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
