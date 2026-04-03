import base64
from typing import Any

from algosdk import encoding
from algosdk.v2client.algod import AlgodClient

# 1 ALGO = 1_000_000 microALGO
PAYMENT_AMOUNT_ALGO = 0.5  # price in ALGO
ALGORAND_TESTNET = "testnet"


class X402Validator:
    def __init__(self, algorand_client: AlgodClient, receiver_address: str):
        self.algod = algorand_client
        self.receiver_address = receiver_address

    def issue_challenge(self, price_algo: float, endpoint: str) -> dict[str, Any]:
        """
        Generates a 402 Required response with Algorand TestNet details.
        Payment is in native ALGO (not USDC ASA).

        Args:
            price_algo: Price in ALGO (e.g., 0.5)
            endpoint: The API endpoint being accessed

        Returns:
            402 response dict with payment requirements
        """
        amount_micro_algo = int(price_algo * 1_000_000)

        return {
            "error": "Payment Required",
            "status": 402,
            "x402": {
                "network": "testnet",
                "conditions": {
                    "receiver": self.receiver_address,
                    "amount": amount_micro_algo,   # in microALGO
                    "currency": "ALGO",
                    "description": f"Payment for {endpoint}",
                },
                "handshake": {
                    "header": "X-PAYMENT",
                    "format": "base64",
                    "contentType": "application/x-algorand-signed-txn",
                },
            },
        }

    def verify_payment(
        self, tx64: str, session_id: str, supabase_client: Any
    ) -> dict[str, Any]:
        """
        Verifies the base64-encoded ALGO payment transaction from X-PAYMENT header.

        Args:
            tx64: Base64-encoded signed transaction
            session_id: Unique session identifier for this payment
            supabase_client: Supabase client instance

        Returns:
            Verification result dict with success status and tx details
        """
        try:
            signed_tx = encoding.msgpack_decode(tx64)
            tx = signed_tx.transaction

            # Expect native ALGO payment (type "pay"), not an ASA transfer
            if tx.type != "pay":
                return {
                    "success": False,
                    "error": f"Invalid transaction type: {tx.type}. Expected native ALGO payment (pay).",
                }

            if str(tx.receiver) != self.receiver_address:
                return {
                    "success": False,
                    "error": f"Invalid receiver. Payment was sent to {tx.receiver}.",
                }

            txid = tx.get_txid()

            # Replay attack prevention via Supabase payment_sessions table
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

            return {
                "success": True,
                "txid": txid,
                "sender": str(tx.sender),
                "amount": tx.amt,
                "amount_human": f"{tx.amt / 1_000_000:.6f} ALGO",
                "currency": "ALGO",
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
