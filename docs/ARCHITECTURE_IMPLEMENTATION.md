# EENDHAN / AlgoGate Architecture & Implementation Document

*This document outlines the exact details of the system as it is currently implemented in the codebase.*

## 1. System Overview

The project is an AI API Gateway ("AlgoGate") implementing the HTTP 402 "Payment Required" standard, specifically powered by the Algorand blockchain (the "x402 protocol"). It protects an underlying premium AI inference service by demanding and verifying on-chain cryptographic proof of payment (ALGO) before processing the AI request. 

The system consists of a **React Frontend**, a **FastAPI Backend**, and a **Supabase PostgreSQL Database**.

---

## 2. Fast API Backend (`projects/backend/`)

The backend serves as the gateway, validator, and the AI dispatcher.

### **Server Core & Routing (`main.py`, `api/`)**
- Built on **FastAPI** with CORS enabled.
- Exposes standard API routes:
  - Base routes `/`
  - Validation routes in `api/x402.py`
  - The protected AI endpoint at `api/ai.py` (`POST /api/ai/premium-endpoint`)

### **Authentication & x402 Middleware (`api/auth.py`)**
- Uses a FastAPI dependency `x402_payment_required` to guard premium endpoints.
- **Challenge Creation:** If a request arrives without an `X-Payment` header, the middleware intercepts it. It interacts with the Algorand Testnet (via `algosdk`) to get the current block round, sets a 60-second expiration, logs a pending session in Supabase, and returns an HTTP 402 JSON payload containing the cost (0.01 USD -> ALGO equivalent), the target wallet, and a generated `sessionId`.
- **Payment Verification:** If the `X-Payment` header is present (containing `tx64=<base64_txn>, session=<session_id>`), it first checks if the session has expired. It then passes the signature to the custom validator.

### **Transaction Validation Protocol (`x402_custom/validator.py`)**
The `X402Validator` class handles the core security guarantees:
- Base64 decodes the `msgpack` encoded transaction.
- Verifies it is a native ALGO `pay` transaction.
- Verifies the `receiver` matches the application's wallet (`EENDHAN_APP_ADDRESS`).
- **Replay Protection:** Queries the Supabase DB (`payment_sessions` table) to ensure the `txid` (used as a `nonce`) hasn't been used before. Wrapped in a `try/except` block to prevent crashes if DB goes down.
- **Blockchain Confirmation:** Connects to the Algorand Testnet Node and blocks until the transaction is confirmed on-chain in recent blocks.
- On success, it updates the Supabase session state to `verified`.

### **AI Inference Engine (`ai_engine/inference.py`)**
- Accessed natively via the Groq API.
- Implements the `"meta-llama/llama-4-scout-17b-16e-instruct"` model.
- Uses a highly opinionated prompt (acting as a strict "Tech Recruiter") configured to solely return an enforced JSON schema containing a "score" and 3 "brutal" feedback points.

### **Database Layer (`db/supabase_client.py`)**
- Connects to Supabase PostgreSQL using REST.
- Implements graceful error handling to generate UUIDs locally if inserting tracking sessions to the remote DB fails.

---

## 3. React Frontend (`projects/Anil_Fireworks-frontend/`)

The frontend acts as the consumer to the x402 gateway, handling wallet connections and payment flows natively.

### **Stack & Styling**
- Built with **React** + **Vite** + **TypeScript**.
- Aesthetic frontend framework utilizing **Tailwind** via `main.css`, complex **Framer Motion** animations (tilt cards, magnetism, scroll fade-up), and Lucide-React icons.

### **Wallet Integration (`@txnlab/use-wallet-react`)**
- Full Pera Wallet / Defly Wallet connectivity suite setup.
- The user connects their wallet to the Algorand Testnet to pay the inference fees.

### **Gate Flow Implementation (`src/components/ResumeReviewer.tsx`)**
The core UI logic managing the payment-inference loop:
1. **Initiate (`handleSubmit`):** The user pastes a resume and clicks "Generate". The frontend sends a `POST` to `/api/ai/premium-endpoint`.
2. **Handle 402 (`payment_required` state):** The backend immediately responds with a 402 Error + x402 metadata. The UI enters a `payment_required` state, which displays an animated, reactive **60-second SVG circular countdown timer**.
3. **Transaction Building (`handlePaymentFlow`):** With the challenge metadata, the frontend constructs an unsigned Algorand transaction sending 0.01 ALGO to the remote wallet. It locks the transaction to the current blockchain `lastRound` parameter dictated by the backend.
4. **Signature & Broadcast (`paying` state):** Prompts the user's wallet extension for a signature. After signature, it broadcasts the raw transaction to the Algorand node. During this period, a loader appears underneath the countdown timer.
5. **Verification Dispatch:** It base64 encodes the signed transaction, formats the `X-Payment` header exactly as required by the backend (`tx64={hash}, session={id}`), and re-runs the API call.
6. **Result Handling (`success` state):** The backend verifies the transaction and returns the AI critique, which the UI structurally renders indicating the Score and the strict feedback points.

---

## 4. Database Schema (`docs/supabase_setup.sql`)

The remote Supabase project (`EENDHAN-PVG`) contains the finalized schema supporting the replay protection and logging mechanisms:

```sql
CREATE TABLE endpoints (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    price_usd NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id TEXT REFERENCES endpoints(id),
    consumer_wallet TEXT NOT NULL,
    target_wallet TEXT NOT NULL,
    amount_algo NUMERIC NOT NULL,
    nonce TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES payment_sessions(id),
    consumer_wallet TEXT NOT NULL,
    endpoint_id TEXT REFERENCES endpoints(id),
    request_payload JSONB,
    response_status INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

These tables effectively track the complete lifecycle of a 402 payment, preventing the same transaction signature from unlocking an API endpoint twice (preventing "Replay Attacks").
