# AlgoGate AI - x402-powered AI API Gateway

## Goal Description
The objective is to build **AlgoGate AI**, an x402-powered AI API Gateway that allows creators to monetize premium AI prompts and workflows on a pay-per-use basis without relying on subscriptions. When users request an AI service (e.g., a Premium Resume Reviewer API), they receive an HTTP 402 Payment Required challenge, pay via the Algorand blockchain (using the standard x402 flow), and upon verification, the locked AI inference is executed and returned.

This plan integrates the locked architecture from `project_guide.md` with the existing starter code (`Anil_Fireworks-frontend` and `Anil_Fireworks-contracts`), leveraging **AlgoKit**, **FastAPI**, and a modular monorepo system to ensure smooth parallel development for a 4-person team.

## User Review Required
> [!IMPORTANT]
> - Please review the **Task Breakdown by Member** and let me know if any roles need adjusting.
> - The Git strategy depends on all 4 members agreeing to the API contract beforehand. Since they are working independently, having a solid API specification (like a shared Swagger/OpenAPI doc or just a clear markdown file) is strictly required to prevent integration bugs later. 

## Project Architecture & Monorepo Structure

To avoid merge conflicts, the project will be organized as a **Monorepo** with strictly isolated directories for each layer. The interface between these layers will be standard HTTP REST APIs.

```text
/d:/EENDHAN/projects/
├── Anil_Fireworks-frontend/      (Owned by Member 2 - Frontend)
│   └── (React, Vite, Tailwind UI)
├── backend/                      (Owned by Member 1 - Backend & Member 3 - Blockchain)
│   └── (FastAPI Python Application)
│       ├── core/                 (x402 middleware & Supabase DB logic)
│       └── ai_engine/            (Gemini API integration - Owned by Member 4)
└── Anil_Fireworks-contracts/     (Owned by Member 3 - Blockchain)
    └── (Puya Python smart contracts / AlgoKit tools)
```

## Task Breakdown for 4 Developers (Parallel Modular Development)

We divide the problem statement to prevent overlapping file changes.

### Member 1 — Backend & Database Lead
**Workspace:** `/projects/backend/`
- Set up the **FastAPI** base application.
- Implement the Supabase interaction logic (CRUD for `users`, `endpoints`, `payment_sessions`, `usage_logs`).
- Define the standard Pydantic models (data schemas) to be used across the backend.
- Build the API endpoints: `POST /api/endpoints/create`, `GET /api/endpoints`.
- **Zero Conflict Strategy:** Owns the `models.py` and `db.py` layer. No one else modifies the Supabase core utilities.

### Member 2 — Frontend & UX Lead
**Workspace:** `/projects/Anil_Fireworks-frontend/`
- Develop the Creator Dashboard (form to create endpoints and view earnings).
- Develop the Landing Page and the Consumer testing UI (where users input the resume to be checked).
- Integrate AlgoKit wallet connection (Pera Wallet / Defly) so consumers can authorize x402 payments.
- Mock the API responses until Member 1 and Member 3 have the backend ready.
- **Zero Conflict Strategy:** Member 2 is the ONLY person editing files inside the frontend directory. They rely completely on agreeing on a JSON API shape with Member 1.


### Member 4 — AI & Product Lead
**Workspace:** `/projects/backend/ai_engine/` and `/docs/`
- [x] Write out the premium Gemini/OpenAI (Groq) prompt templates (e.g., the exact prompt sequence for a "Premium Resume Reviewer").
- [x] Build the `POST /api/execute/{endpoint_id}` AI pipeline. Takes the user's prompt string, wraps it with system prompts securely, hits Gemini/Groq, formats the output, and returns it.
- **Zero Conflict Strategy:** Only works inside `ai_engine/`. They provide a single function `run_analyzer(resume_text)` which Member 1 imports into the main FastAPI route.

## Git Conflict Prevention Strategy

To ensure zero merge conflicts and a smooth GitHub workflow for a distributed 4-person team:

### 1. API First Design (Day 1)
- **Do not code until the API is agreed on.** Write a shared `API_CONTRACT.md` file that specifies exactly what JSON the Backend will send and Frontend will receive.
- E.g., The frontend needs to know that `POST /api/x402/challenge` returns `{"sessionId": "123", "amount": 1.5, "nonce": "xyz"}` exactly.

### 2. Feature Branching Model
No one pushes to the `main` branch. Ever.
Each member creates branches prefixed with their module:
- `frontend/creator-dashboard`
- `backend/auth-supabase`
- `algo/x402-verify`
- `ai/resume-prompt`

### 3. Separation by Folder
Because the team is geographically/physically separated across machines:
- **Member 2** will *only* touch files in `projects/Anil_Fireworks-frontend/`.
- **Member 1** will *only* touch `projects/backend/routes/` and `projects/backend/db/`.
- **Member 3** will *only* touch `projects/backend/x402/` and `Anil_Fireworks-contracts/`.
- **Member 4** will *only* touch `projects/backend/ai/`.

If Member 1 edits `backend/routes.py` and Member 3 edits `backend/x402/verify.py`, they will **never have a git conflict** because they are editing entirely different files.

### 4. Pull Requests (PRs)
- When a task is done, the member opens a Pull Request on GitHub.
- At least ONE other member must review the code before merging it into `main`.

## Verification Plan
### Automated Tests
- Test x402 payment challenge backend logic without a real wallet connection (Member 3).
- Frontend mock API testing (Member 2).

### Manual Verification
- All branches merged into `main`.
- Use AlgoKit LocalNet or TestNet to process a real wallet payment transaction in the browser.
- Verify the FastAPI backend successfully delegates to the AI script, logging results successfully to Supabase.
### Member 3 — Blockchain & x402 Flow Lead
**Workspace:** `/projects/backend/x402/` & `/projects/Anil_Fireworks-contracts/`
- Write the Algorand logic to generate the x402 Payment Challenge (`POST /api/x402/challenge`).
- Write the logic to verify transactions hitting the Algorand testnet directly inside FastAPI (`POST /api/x402/verify`). Checks proper target amount, target wallet, and prevents double-spending the same `tx_hash`.
- If required, write explicit smart contracts in Python/Puya to handle payout splits.
- **Zero Conflict Strategy:** Member 3 only writes Python code within their dedicated `/projects/backend/x402` module folder or the contracts folder. They expose a clean python function `verify_payment(tx_hash, session_id)` that Member 1 can import.
