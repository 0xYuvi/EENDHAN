# Antigravity Starter Prompts for Distributed Team

Since your 4 developers are working on separate machines using Antigravity, they can just copy-paste their specific prompt into their instance of Antigravity to get their module built quickly and securely.

---

### Member 1: Backend & Database Lead
**Context:** This member is responsible for generating the core FastAPI application and database models in the `projects/backend` folder.

**Copy this prompt:**
> "I am the Backend Lead for 'AlgoGate AI', an x402-payment API gateway. Please create a new FastAPI application in the `projects/backend` folder. 
> 
> My tasks are:
> 1. Set up `main.py` with standard FastAPI routing layout and CORS middleware allowing our frontend.
> 2. Create a `db/models.py` file with Pydantic models for: `User`, `Endpoint`, `PaymentSession`, and `UsageLog`. 
> 3. Create dummy data/mock implementations for the following routes: `POST /api/endpoints/create`, `GET /api/endpoints`, `POST /api/x402/challenge`, and `POST /api/x402/verify`.
> 4. Ensure you strictly silo all your work inside the `projects/backend` directory so we don't conflict with other team members. We will plug in Supabase DB connections later. Let me know when the mock server is running!"

---

### Member 2: Frontend & UX Lead
**Context:** This member is responsible for building out the UI using the existing React/Vite starter template at `projects/Anil_Fireworks-frontend`.

**Copy this prompt:**
> "I am the Frontend Lead for 'AlgoGate AI'. Please open the `projects/Anil_Fireworks-frontend` directory. 
> 
> My tasks are:
> 1. We already have a Vite+React+Tailwind app. Please add a beautiful Landing Page and a Creator Dashboard layout where a user can create an API endpoint (entering a title, price in ALGO, and system prompt).
> 2. Create the 'Consumer API Interface'. This page should have a text area for the user to paste a resume. 
> 3. Wire the 'Submit' button on this interface to throw a mock HTTP 402 Payment Required error, which should pop up a sleek Payment Modal UI indicating 'Please pay 0.1 ALGO to continue'.
> 4. Do not touch anything outside of the `projects/Anil_Fireworks-frontend` folder to avoid git conflicts with my team. Focus completely on making the UI feel premium, using rich aesthetics and smooth micro-animations."

---

### Member 3: Blockchain & x402 Lead
**Context:** This member is writing the specific Python verification library that Member 1 will import into the FastAPI backend.

**Copy this prompt:**
> "I am the Blockchain Lead for 'AlgoGate AI'. Please create a new folder specifically for me at `projects/backend/x402/`.
> 
> My tasks are:
> 1. Write an `x402_validator.py` script using the Algorand Python SDK.
> 2. Create a function `def issue_challenge(expected_amount, endpoint_id)` that generates a secure nonce/session ID and returns the required payload.
> 3. Create a function `def verify_payment(tx_hash, session_id, expected_amount, target_wallet)` that fetches the provided transaction from the Algorand Testnet. It must verify that the amount is correct, it was sent to the correct wallet, and ensure it isn't an attack.
> 4. Please restrict all your file creations to the `projects/backend/x402/` directory to avoid conflicts with the rest of the backend team."

---

### Member 4: AI & Product Lead
**Context:** This member writes the AI intelligence wrapper that runs only when the payment is successful.

**Copy this prompt:**
> "I am the AI Lead for 'AlgoGate AI' building a Premium Resume Reviewer API feature. Please create a new folder specifically for me at `projects/backend/ai_engine/`.
> 
> My tasks are:
> 1. Write an `inference.py` script. 
> 2. Implement a function `def run_analyzer(resume_text: str)` that connects to the Google Gemini API (using standard API keys from an `.env` file). 
> 3. The function should use a strong, highly opinionated system prompt that tells Gemini to act as a harsh Tech Recruiter grading the resume on a scale of 1-100 and providing 3 bullet points of brutal feedback.
> 4. Please restrict all your file creations to the `projects/backend/ai_engine/` directory so we don't trigger merge conflicts. Provide a test suite so I can run this script independently right now to tune the prompts before we merge it with the FastAPI routes."
