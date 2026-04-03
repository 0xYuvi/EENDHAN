> **"I am the Frontend Lead for 'AlgoGate AI', an x402-powered pay-per-use AI API gateway built on Algorand. The project lives at `projects/Anil_Fireworks-frontend` — it's a Vite + React + Tailwind app. Please open that directory and build out the full frontend UI.**
>
> **DESIGN THEME — MetaMask-inspired aesthetic:**
> The entire site must feel like metamask.io. Specifically:
> - **Background:** Warm cream/off-white (`#F2EDE8`) as the base page color — NOT dark, NOT white
> - **Typography:** Ultra-bold, condensed, full-width display headings (use `Syne` or `Archivo Black` from Google Fonts). Text should be MASSIVE and bleed edge-to-edge, just like MetaMask's "YOUR HOME ONCHAIN" hero
> - **Colors:** Deep dark purple (`#1C0057`) as primary text + brand color. Accent cards in: forest green (`#1A3D35`), salmon/peach (`#E8856A`), soft lavender, and warm cream — these should appear as bento-grid card tiles
> - **Buttons:** Pill-shaped (`border-radius: 999px`), dark fill, white text. Clean and minimal
> - **Layout:** Asymmetric bento grids, full-bleed sections that alternate background colors, generous spacing
> - **Animations:** Smooth scroll-triggered reveals, staggered fade-ins on hero text, subtle hover lifts on cards
>
> **Pages to build:**
>
> **1. Landing Page (`/`)**
> - Hero: Giant full-width heading: **"PAY ONCE. GET THE AI."** in dark purple on cream background. Below it, a subheading: *"x402-powered pay-per-use access for premium AI APIs — built on Algorand."* A pill CTA button: "EXPLORE ENDPOINTS"
> - Features bento grid: 3 colorful cards explaining: (1) Creator publishes an AI endpoint + sets ALGO price, (2) User calls it, gets HTTP 402 Payment Required, (3) Payment verified → AI unlocks instantly. Each card uses a different accent color
> - Stats strip: "0.1 ALGO per call · Instant verification · No subscriptions · Anti-replay protection"
> - Footer: minimal, same cream bg
>
> **2. Creator Dashboard (`/dashboard`)**
> - Top: greeting + wallet address placeholder
> - Form card: "Create New AI Endpoint" — fields: Endpoint Title, Price in ALGO (number), System Prompt (textarea), Category dropdown. Pill submit button: "PUBLISH ENDPOINT"
> - Below form: list of created endpoints as cards showing title, price, and a "total calls" badge
> - Earnings summary: small stat tiles showing Total Earnings, Total Calls, Active Endpoints
>
> **3. Consumer / Try API Page (`/try`)**
> - Large heading: "TRY THE RESUME REVIEWER API"
> - Big textarea: "Paste your resume here..."
> - Pill submit button: "SUBMIT FOR REVIEW"
> - On click: mock an HTTP 402 error → show a sleek **Payment Modal** that appears as a centered overlay. The modal should say: "Payment Required · 0.1 ALGO", show a fake session ID + nonce, have a "PAY WITH ALGORAND WALLET" button that when clicked shows a success state: "✓ Payment Verified" and then reveals a mock AI response card with a score like "72/100" and 3 bullet points of harsh recruiter feedback
>
> **Technical requirements:**
> - Stay 100% inside `projects/Anil_Fireworks-frontend/` — do NOT touch backend folders
> - Use React Router for navigation between the 3 pages
> - All mock data hardcoded — no real API calls yet
> - Import Google Fonts (`Archivo Black` for display, `DM Sans` for body) via the index.html `<link>` tag
> - Use Tailwind for layout/spacing, but define the custom color palette (`cream`, `deep-purple`, `forest-green`, `salmon`) in `tailwind.config.js`
> - Keep all component files organized: `src/pages/`, `src/components/`
> - The UI should feel PREMIUM, bold, and Web3-native — like MetaMask meets a Y Combinator product**"

