# EENDHAN CLI

Command-line interface for the EENDHAN (AlgoGate) pay-per-use AI API system.

## Table of Contents
1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [Commands Reference](#commands-reference)
4. [Configuration](#configuration)
5. [Examples](#examples)
6. [Environment Variables](#environment-variables)
7. [Troubleshooting](#troubleshooting)

---

## Installation

### Install from source (local development)

```bash
cd packages/cli
npm install
npm run build
npm link
```

### Verify Installation

```bash
eendhan --version
# Output: 1.0.0
```

### Requirements

- Node.js 18 or higher
- npm or yarn
- An Algorand wallet (for signing transactions)

---

## Getting Started

### 1. Initialize an Endpoint

```bash
eendhan init
```

This walks you through setting up an endpoint interactively:

```
  /$$$$$$  /$$                      /$$$$$$              /$$
 /$$__  $$| $$                     /$$__  $$            | $$
| $$  \ $$| $$  /$$$$$$   /$$$$$$ | $$  \__/  /$$$$$$  /$$$$$$    /$$$$$$
| $$$$$$$$| $$ /$$__  $$ /$$__  $$| $$ /$$$$ |____  $$|_  $$_/   /$$__  $$
| $$__  $$| $$| $$  \ $$| $$  \ $$| $$|_  $$  /$$$$$$$  | $$    | $$$$$$$$
| $$  | $$| $$| $$  | $$| $$  | $$| $$  \ $$ /$$__  $$  | $$ /$$| $$_____/
| $$  | $$| $$|  $$$$$$$|  $$$$$$/|  $$$$$$/|  $$$$$$$  |  $$$$/|  $$$$$$$
|__/  |__/|__/ \____  $$ \______/  \______/  \_______/   \___/   \_______/
               /$$  \ $$
              |  $$$$$$/
               \______/

Initializing new EENDHAN endpoint...

? API Name / Title: PFP Generator
? Brief Description: Generates unique robot avatars
? Your Target URL: https://robohash.org/
? HTTP Method: GET
── Pricing Tiers ──
  Add your pricing tiers. Prices are in USDC.

? Tier 1 name: basic
? Tier 1 price (USDC): 0.01
? Add another tier? Yes
? Tier 2 name: premium
? Tier 2 price (USDC): 0.05
? Add another tier? No
? Endpoint ID (UUID): 123e4567-e89b-12d3-a456-426614174000

✓ Endpoint registered locally!
  Title:       PFP Generator
  ID:          123e4567-e89b-12d3-a456-426614174000
  Target:      GET https://robohash.org/
  Tiers:
    basic           → 0.0100 USDC
    premium         → 0.0500 USDC

Run: eendhan endpoints list
```

### 2. List Your Endpoints

```bash
eendhan endpoints list
```

### 3. Call an Endpoint

```bash
eendhan call 123e4567-e89b-12d3-a456-426614174000 \
  --payload '{"query": "robot-1"}' \
  --tier basic
```

---

## Commands Reference

### Global Options

```
Options:
  -V, --version    Show version number
  -h, --help       Display help for command
```

---

### `eendhan init`

Initialize a new endpoint with an interactive wizard. Prompts for:

| Prompt | Description |
|--------|-------------|
| API Name / Title | Name of your endpoint |
| Brief Description | What the endpoint does |
| Your Target URL | The upstream API URL that AlgoGate proxies to |
| HTTP Method | POST, GET, or PUT |
| Pricing Tiers | Add as many tiers as you want (name + USDC price) |
| Endpoint ID | Auto-generated UUID (or enter your own) |

**Key:** Pricing tiers are stored in **micro-USDC** internally (1 USDC = 1,000,000 micro-USDC), matching the backend and frontend format.

---

### `eendhan endpoints list`

List all locally configured endpoints with their tiers.

**Example output:**

```
┌─ Your Endpoints ─────────────────────────────────────────────────────┐
  PFP Generator
  ID:     123e4567-e89b-12d3-a456-426614174000
  Target: GET https://robohash.org/
  Tiers:  basic: 0.0100 USDC  ·  premium: 0.0500 USDC
  Status: ● Active
└──────────────────────────────────────────────────────────────────────┘
```

---

### `eendhan call <endpoint-id>`

Call an endpoint via the x402 gateway. Sends to the backend's `/api/execute/:id` endpoint.

**Options:**

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--payload` | `-p` | Request payload (JSON string) | `{}` |
| `--tier` | `-t` | Pricing tier to use | `basic` |

**Examples:**

```bash
# Simple call
eendhan call 123e4567-e89b-12d3-a456-426614174000 \
  --payload '{"query": "robot-1"}'

# With a specific tier
eendhan call 123e4567-e89b-12d3-a456-426614174000 \
  --payload '{"prompt": "Hello AI!"}' \
  --tier premium
```

**Flow:**
1. Validates the endpoint exists in local config
2. Validates the requested tier exists
3. Sends `POST /api/execute/:id` with `X-AI-Tier` header
4. If `402`: Displays payment challenge details (cost, session ID)
5. If `429`: Reports rate limit
6. If `200`: Displays the proxied response (JSON or text)

> **Note:** Full payment signing requires a wallet. Use the frontend or SDK for the complete x402 payment flow.

---

### `eendhan status`

Display system status including backend URL, endpoint count, and rate limit configuration.

```
╔══════════════════════════════════════════╗
║         EENDHAN STATUS                   ║
╠══════════════════════════════════════════╣
║  Backend URL:    http://localhost:8000    ║
║  Endpoints:      2                       ║
╠══════════════════════════════════════════╣
║  Request Rate:   100 req / min           ║
║  Burst Cap:      5 exec / 10s            ║
║  Velocity Cap:   $50 / 10 min            ║
║  Nonce Window:   60 seconds              ║
╚══════════════════════════════════════════╝
```

---

### `eendhan config`

Manage CLI configuration.

#### Set a config value

```bash
eendhan config set backendUrl https://your-backend.onrender.com
eendhan config set defaultTier premium
```

**Available keys:** `backendUrl`, `defaultTier`

#### View current config

```bash
eendhan config view
```

---

## Configuration

### Config File Location

- Project: `./.eendhan/config.json`

### Config Structure

```json
{
  "version": "1.0.0",
  "backendUrl": "http://localhost:8000",
  "defaultTier": "basic",
  "endpoints": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "PFP Generator",
      "description": "Generates unique robot avatars",
      "targetUrl": "https://robohash.org/",
      "method": "GET",
      "pricingTiers": {
        "basic": 10000,
        "premium": 50000
      },
      "creatorWallet": "",
      "status": "active",
      "created": "2026-04-06T17:00:00.000Z"
    }
  ]
}
```

> **Note:** `pricingTiers` values are in micro-USDC (1 USDC = 1,000,000). This matches the backend `CreateEndpointReq` and the frontend `CreatorPortal` format.

---

## Examples

### Example 1: Register and Call a Robohash Endpoint

```bash
# 1. Register
eendhan init
# → Title: PFP Generator
# → URL: https://robohash.org/
# → Method: GET
# → Tier: basic = 0.01

# 2. List
eendhan endpoints list

# 3. Call
eendhan call 123e4567-e89b-12d3-a456-426614174000 \
  --payload '{"query": "robot-1"}'
```

### Example 2: Point to a Deployed Backend

```bash
# Set backend URL to your Render deployment
eendhan config set backendUrl https://your-backend.onrender.com

# Call endpoint
eendhan call YOUR_ENDPOINT_ID \
  --payload '{"prompt": "Hello AI"}' \
  --tier premium
```

### Example 3: Multi-Tier Setup

```bash
eendhan init
# Tier 1: basic = 0.005
# Tier 2: standard = 0.01
# Tier 3: professional = 0.05
# Tier 4: enterprise = 0.25

# Call with specific tier
eendhan call ENDPOINT_ID --tier professional --payload '{}'
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EENDHAN_BACKEND_URL` | Backend API URL | `http://localhost:8000` |

---

## Troubleshooting

### Common Issues

**"Endpoint not found"**
```bash
# Verify the endpoint exists locally
eendhan endpoints list

# Make sure you're using the correct UUID
eendhan call <correct-uuid> --payload '{}'
```

**"Tier not found"**
```bash
# List endpoints to see available tiers
eendhan endpoints list
# Then use a valid tier name
eendhan call <id> --tier basic
```

**"Connection failed"**
```bash
# Check if the backend is running
eendhan status

# Update backend URL if needed
eendhan config set backendUrl http://localhost:8000
```

**"402 Payment Required"**
- This is expected! The CLI shows the payment challenge details.
- For full payment flow with wallet signing, use the **frontend** or **SDK**.

---

## License

MIT License - See LICENSE file for details.