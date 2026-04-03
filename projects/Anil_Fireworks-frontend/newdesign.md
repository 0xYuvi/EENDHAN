> **"The current UI at `projects/Anil_Fireworks-frontend` is completely unstyled and basic. I need you to do a full visual redesign to match the premium aesthetic of metamask.io. Do NOT touch any logic, routing, or functionality — only redesign the visuals and layout.**
>
> ---
>
> **FIRST — Install these packages:**
> ```bash
> npm install framer-motion gsap
> ```
>
> ---
>
> **DESIGN RULES — follow every single one:**
>
> - **Global background:** `#F2EDE8` (warm cream) — set this on the `body` in `index.css`
> - **Primary font:** Add this to `index.html` `<head>`:
>   ```html
>   <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
>   ```
>   Then in `index.css`: `font-family: 'DM Sans', sans-serif;`
> - **Hero headings:** `font-family: 'Archivo Black', sans-serif` — massive, full viewport width, dark purple `#1C0057`
> - **Buttons:** Always pill-shaped — `border-radius: 9999px`, dark fill `#1C0057`, white text, no square buttons anywhere
> - **Cards:** Rounded corners `border-radius: 20px`, no plain white cards — use colored backgrounds: `#1C0057` (deep purple), `#1A3D35` (forest green), `#E8856A` (salmon), `#C8C0E8` (lavender)
>
> ---
>
> **LANDING PAGE — rebuild it section by section:**
>
> **Section 1 — Hero (cream background `#F2EDE8`):**
> - Giant heading using Archivo Black, at least `font-size: clamp(4rem, 10vw, 9rem)`, text: `"PAY ONCE.`
> `GET THE AI."` in `#1C0057`, spanning full width
> - Below it: subtext in DM Sans — `"x402-powered pay-per-use access for premium AI APIs — built on Algorand."`
> - One pill CTA button: `"EXPLORE ENDPOINTS"` with background `#1C0057`
> - Animate the heading words with framer-motion: each word fades + slides up with staggered delay `staggerChildren: 0.1`
>
> **Section 2 — Bento Grid (cream background):**
> - CSS grid: `grid-template-columns: 1fr 1fr` on desktop, single column on mobile
> - 4 large cards, each at least `300px` tall, `border-radius: 20px`, colored backgrounds:
>   - Card 1 (`#1C0057` bg, white text): `"Create any AI endpoint"` — bold heading + 2 lines of description
>   - Card 2 (`#1A3D35` bg, white text): `"Get HTTP 402 Payment Required"` — bold heading + description
>   - Card 3 (`#E8856A` bg, dark text): `"Pay 0.1 ALGO. Verified instantly."` — bold heading + description
>   - Card 4 (`#C8C0E8` bg, dark text): `"AI unlocks. Response returned."` — bold heading + description
> - Each card: `padding: 40px`, hover effect with framer-motion `whileHover={{ y: -8, transition: { duration: 0.2 } }}`
> - Animate cards into view with framer-motion `whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 50 }}`
>
> **Section 3 — Stats strip (`#1C0057` background, white text):**
> - Full width, `padding: 40px`
> - Large text: `"0.1 ALGO per call · Instant verification · No subscriptions · Replay-proof security"`
> - Font size `clamp(1.2rem, 3vw, 2rem)`, Archivo Black
>
> **Section 4 — How it works (cream background):**
> - 3 steps side by side on desktop
> - Each step: giant step number in very light purple `#E8E4F8`, Archivo Black `8rem`, with heading and description overlaid
> - Animate each step in with scroll reveal
>
> ---
>
> **NAVBAR — rebuild it:**
> - Background: `#F2EDE8` (matches page, no box shadow)
> - Left: Logo text `"AlgoGate AI"` in Archivo Black, `#1C0057`
> - Right: nav links in DM Sans + one pill CTA button `"LAUNCH APP"` with `#1C0057` background
> - `position: sticky`, `top: 0`, `z-index: 50`
>
> ---
>
> **DASHBOARD PAGE — rebuild it:**
> - Page background: `#F2EDE8`
> - Top: Large Archivo Black heading `"CREATOR DASHBOARD"` in `#1C0057`
> - 3 stat tiles in a row — each a colored card (`#1C0057`, `#1A3D35`, `#E8856A`) with big white number and label
> - Form card: white background `#FFFFFF`, `border-radius: 20px`, `padding: 40px`, `box-shadow: 0 4px 40px rgba(0,0,0,0.06)` — inputs with `border-radius: 12px`, `border: 1.5px solid #E0D8D0`, pill submit button
> - Endpoint list cards: same colored card style as bento grid
>
> ---
>
> **TRY API PAGE — rebuild it:**
> - Page background: `#F2EDE8`
> - Giant heading: `"TRY THE RESUME REVIEWER"` in Archivo Black
> - Price pill badge: `background: #1C0057`, white text, `"0.1 ALGO per call"`
> - Textarea: large, `border-radius: 16px`, `border: 2px solid #C8C0E8`, `min-height: 250px`, `padding: 24px`
> - Submit button: full-width pill, `background: #1C0057`, white text, large font
> - **Payment Modal** (framer-motion AnimatePresence):
>   - Dark overlay backdrop `rgba(0,0,0,0.6)`
>   - Modal card: `background: #F2EDE8`, `border-radius: 24px`, `padding: 48px`, centered
>   - Shows: `"Payment Required"` in Archivo Black, amount `"0.1 ALGO"`, mock session ID + nonce in monospace font
>   - PAY button: pill, `#1C0057` bg
>   - After clicking PAY: animate to success state — green checkmark, `"✓ Payment Verified"` text, then slide in the AI result card showing score `"72/100"` and 3 feedback bullets
>
> ---
>
> **GLOBAL CSS to add in `index.css`:**
> ```css
> * { margin: 0; padding: 0; box-sizing: border-box; }
> body { background-color: #F2EDE8; font-family: 'DM Sans', sans-serif; }
> h1, h2, h3 { font-family: 'Archivo Black', sans-serif; }
> section { padding: 80px 5vw; }
> ```
>
> ---
>
> **Do NOT change:** React Router setup, page file names, any API call logic, the `.env` file, or `package.json` dev script.
>
> Rebuild only the visual layer. Make it look stunning."**

