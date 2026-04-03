import base64
from typing import Any
import uuid

from algosdk import encoding
from algosdk.v2client.algod import AlgodClient
from core.config import USDC_ASSET_ID

# USDC has 6 decimals, like ALGO microALGO
# 1 USDC = 1_000_000 micro-USDC units
ALGORAND_TESTNET = "testnet"


class X402Validator:
    def __init__(self, algorand_client: AlgodClient, receiver_address: str):
        self.algod = algorand_client
        self.receiver_address = receiver_address

    def issue_challenge(
        self,
        price_algo: float,  # kept as kwarg name for backwards compat, now treats as USDC amount
        endpoint: str,
        expires_at: int,
        last_round: int,
        receiver_address: str = None,
    ) -> dict[str, Any]:
        """
        Generates a 402 Payment Required response specifying a USDC ASA transfer.
        """
        # Treat the price value as USDC (6 decimals)
        amount_micro_usdc = int(price_algo * 1_000_000)
        receiver = receiver_address or self.receiver_address

        return {
            "error": "Payment Required",
            "status": 402,
            "sessionId": str(uuid.uuid4()),
            "expiresAt": expires_at,
            "lastRound": last_round,
            "x402": {
                "network": "testnet",
                "conditions": {
                    "receiver": receiver,
                    "amount": amount_micro_usdc,   # micro-USDC units
                    "currency": "USDC",
                    "assetId": USDC_ASSET_ID,       # Algorand Testnet USDC ASA ID
                    "description": f"Payment for {endpoint} (Expires in 60s)",
                },
                "handshake": {
                    "header": "X-PAYMENT",
                    "format": "base64",
                    "contentType": "application/x-algorand-signed-txn",
                },
            },
        }

    def verify_payment(
        self, tx64: str, session_id: str, supabase_client: Any, receiver_address: str = None
    ) -> dict[str, Any]:
        """
        Verifies the base64-encoded USDC ASA payment transaction from X-PAYMENT header.

        Args:
            tx64: Base64-encoded signed transaction
            session_id: Unique session identifier for this payment
            supabase_client: Supabase client instance
            receiver_address: Dynamic receiver address override

        Returns:
            Verification result dict with success status and tx details
        """
        try:
            signed_tx = encoding.msgpack_decode(tx64)
            tx = signed_tx.transaction
            receiver = receiver_address or self.receiver_address

            # Must be an ASA transfer (axfer), NOT a native pay transaction
            if tx.type != "axfer":
                return {
                    "success": False,
                    "error": f"Invalid transaction type: '{tx.type}'. Expected USDC ASA transfer (axfer).",
                }

            # Verify the correct ASA is being transferred (prevent fake ASA attacks)
            if tx.index != USDC_ASSET_ID:
                return {
                    "success": False,
                    "error": f"Wrong asset. Expected USDC (ASA ID {USDC_ASSET_ID}), got ASA ID {tx.index}.",
                }

            # Verify receiver
            if str(tx.receiver) != receiver:
                return {
                    "success": False,
                    "error": f"Invalid receiver. Payment was sent to {tx.receiver}, expected {receiver}.",
                }

            txid = tx.get_txid()

            # Replay attack prevention via Supabase payment_sessions table
            try:
                existing = (
                    supabase_client.table("payment_sessions")
                    .select("id")
                    .eq("nonce", txid)
                    .execute()
                )
                if existing.data:
                    return {
                        "success": False,
                        "error": "Transaction already used (replay attack prevented)",
                    }
            except Exception as db_err:
                print(f"[WARN] DB replay check failed (non-fatal): {db_err}")

            confirmed = self._wait_for_confirmation(txid)
            if not confirmed:
                return {"success": False, "error": "Transaction not confirmed on-chain"}

            # Log verified payment — update the existing session row
            try:
                supabase_client.table("payment_sessions").update(
                    {
                        "status": "verified",
                        "nonce": txid,  # store txid in nonce field for replay protection
                    }
                ).eq("id", session_id).execute()
            except Exception as db_err:
                print(f"[WARN] DB update failed (non-fatal): {db_err}")

            # amount is in micro-USDC (6 decimals)
            amount_human = f"{tx.amount / 1_000_000:.6f} USDC"

            return {
                "success": True,
                "txid": txid,
                "sender": str(tx.sender),
                "amount": tx.amount,
                "amount_human": amount_human,
                "currency": "USDC",
                "asset_id": USDC_ASSET_ID,
                "session_id": session_id,
            }

        except Exception as e:
            return {"success": False, "error": f"Verification failed: {str(e)}"}

    def _wait_for_confirmation(self, txid: str, timeout_rounds: int = 10) -> bool:
        """
        Wait for transaction confirmation on Algorand TestNet.
        """
        try:
            result = self.algod.pending_transaction_info(txid)
            if result.get("confirmed-round"):
                return True

            for _ in range(timeout_rounds):
                self.algod.status_after_block(
                    self.algod.status().get("last-round", 0) + 1
                )
                result = self.algod.pending_transaction_info(txid)
                if result.get("confirmed-round"):
                    return True
            return False
        except Exception:
            return False
