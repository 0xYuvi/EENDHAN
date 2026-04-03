import base64
from typing import Any

from algosdk import encoding
from algosdk.v2client.algod import AlgodClient

USDC_ASA_ID = 10458941
ALGORAND_TESTNET = "testnet"


class X402Validator:
    def __init__(self, algorand_client: AlgodClient, receiver_address: str):
        self.algod = algorand_client
        self.receiver_address = receiver_address

    def issue_challenge(self, price_usd: float, endpoint: str) -> dict[str, Any]:
        """
        Generates a 402 Required response with Algorand TestNet details.

        Args:
            price_usd: Price in USD (e.g., 0.01 for 1 cent)
            endpoint: The API endpoint being accessed

        Returns:
            402 response dict with payment requirements
        """
        amount_micro_usdc = int(price_usd * 1_000_000)

        return {
            "error": "Payment Required",
            "status": 402,
            "x402": {
                "network": "testnet",
                "conditions": {
                    "receiver": self.receiver_address,
                    "assetId": USDC_ASA_ID,
                    "amount": amount_micro_usdc,
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
        Verifies the base64-encoded transaction from X-PAYMENT header.

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

            if tx.type != "axfer":
                return {
                    "success": False,
                    "error": f"Invalid transaction type: {tx.type}. Expected asset transfer.",
                }

            if tx.index != USDC_ASA_ID:
                return {
                    "success": False,
                    "error": f"Invalid asset: {tx.index}. Expected USDC ({USDC_ASA_ID}).",
                }

            if str(tx.receiver) != self.receiver_address:
                return {
                    "success": False,
                    "error": f"Invalid receiver. Payment was sent to {tx.receiver}.",
                }

            txid = tx.get_txid()

            existing = (
                supabase_client.table("payments")
                .select("txid")
                .eq("txid", txid)
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

            supabase_client.table("payments").insert(
                {
                    "txid": txid,
                    "session_id": session_id,
                    "sender": str(tx.sender),
                    "amount": tx.amount,
                    "asset_id": tx.index,
                    "status": "verified",
                }
            ).execute()

            supabase_client.table("sessions").update({"status": "paid"}).eq(
                "id", session_id
            ).execute()

            return {
                "success": True,
                "txid": txid,
                "sender": str(tx.sender),
                "amount": tx.amount,
                "amount_human": tx.amount / 1_000_000,
                "asset_id": tx.index,
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
