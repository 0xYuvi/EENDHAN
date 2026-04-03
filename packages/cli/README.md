# EENDHAN CLI - Complete Guide

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

### Install from npm

```bash
# Global installation (recommended)
npm install -g @eendhan/cli

# Or use with npx (no installation needed)
npx @eendhan/cli --help
```

### Verify Installation

```bash
eendhan --version
# Output: @eendhan/cli v1.0.0
```

### Requirements

- Node.js 18 or higher
- npm or yarn
- An Algorand wallet (for signing transactions)

---

## Getting Started

### 1. Initialize Configuration

```bash
eendhan init
```

This creates a `.eendhan` config file in your project with default settings.

### 2. Register an Endpoint

```bash
eendhan endpoint create \
  --title "My AI Chat" \
  --price 0.01 \
  --url "https://api.example.com/chat" \
  --method POST
```

### 3. Make Your First Call

```bash
eendhan call 123e4567-e89b-12d3-a456-426614174000 \
  --payload '{"message": "Hello AI!"}'
```

---

## Commands Reference

### Global Options

```bash
Options:
  -V, --version          Show version number
  -v, --verbose          Enable verbose logging
  --json                 Output as JSON
  --help                 Show help
```

---

### `eendhan init`

Initialize a new EENDHAN project.

```bash
eendhan init [project-name]
```

**Options:**
- `[project-name]` - Optional project name (default: current directory)

**Example:**

```bash
$ eendhan init my-ai-app
✓ Created .eendhan configuration
✓ Project initialized: my-ai-app
```

---

### `eendhan endpoint`

Manage API endpoints.

#### Create Endpoint

```bash
eendhan endpoint create [options]
```

**Options:**

| Flag | Short | Description | Required |
|------|-------|------------|----------|
| `--title` | `-t` | Endpoint title | Yes |
| `--price` | `-p` | Price per call in USDC | Yes |
| `--url` | `-u` | Target API URL | Yes |
| `--method` | `-m` | HTTP method (GET, POST, PUT, DELETE) | No |
| `--description` | `-d` | Description | No |

**Example:**

```bash
eendhan endpoint create \
  --title "GPT-4 Code Reviewer" \
  --price 0.05 \
  --url "https://api.openai.com/v1/chat/completions" \
  --method POST \
  --description "AI-powered code review"
```

**Output:**

```
✓ Endpoint created successfully
  ID: 123e4567-e89b-12d3-a456-426614174000
  Title: GPT-4 Code Reviewer
  Price: 0.05 USDC
  URL: https://api.openai.com/v1/chat/completions
```

---

#### List Endpoints

```bash
eendhan endpoint list
```

**Example:**

```bash
$ eendhan endpoint list

┌────────────────────────────────────┬─────────────────┬──────────┬─────────────┐
│ ID                                 │ Title           │ Price    │ Status      │
├────────────────────────────────────┼─────────────────┼──────────┼─────────────┤
│ 123e4567-e89b-12d3-a456-426614174000 │ GPT-4 Code Rev │ 0.05 USDC│ Active      │
│ abcdef01-2345-6789-0abc-def012345678 │ Image Generator│ 0.10 USDC│ Active      │
└────────────────────────────────────┴─────────────────┴──────────┴─────────────┘
```

---

#### View Endpoint Details

```bash
eendhan endpoint show <endpoint-id>
```

**Example:**

```bash
$ eendhan endpoint show 123e4567-e89b-12d3-a456-426614174000

ID:          123e4567-e89b-12d3-a456-426614174000
Title:       GPT-4 Code Reviewer
Description: AI-powered code review
Price:       0.05 USDC
Method:      POST
URL:         https://api.openai.com/v1/chat/completions
Status:      Active
Created:     2026-04-04T10:30:00Z
```

---

#### Add Pricing Tiers

```bash
eendhan endpoint tiers add <endpoint-id> [tiers...]
```

**Example:**

```bash
$ eendhan endpoint tiers add 123e4567-e89b-12d3-a456-426614174000 \
  --fast 0.01 \
  --standard 0.05 \
  --premium 0.10 \
  --enterprise 0.25

✓ Tiers updated
  fast:       0.01 USDC
  standard:  0.05 USDC
  premium:   0.10 USDC
  enterprise: 0.25 USDC
```

---

#### Delete Endpoint

```bash
eendhan endpoint delete <endpoint-id>
```

**Example:**

```bash
$ eendhan endpoint delete 123e4567-e89b-12d3-a456-426614174000
⚠ This will delete the endpoint. Continue? (y/N): y
✓ Endpoint deleted
```

---

### `eendhan call`

Make an API call to an endpoint.

```bash
eendhan call <endpoint-id> [options]
```

**Options:**

| Flag | Short | Description |
|------|-------|--------------|
| `--payload` | `-p` | Request payload (JSON string) |
| `--tier` | `-t` | Pricing tier to use |
| `--file` | `-f` | Load payload from file |
| `--header` | `-H` | Custom headers (key=value) |

**Examples:**

```bash
# Simple call with JSON payload
eendhan call 123e4567-e89b-12d3-a456-426614174000 \
  --payload '{"prompt": "Hello AI!"}'

# Using a specific tier
eendhan call 123e4567-e89b-12d3-a456-426614174000 \
  --payload '{"prompt": "Hello AI!"}' \
  --tier premium

# Load payload from file
eendhan call 123e4567-e89b-12d3-a456-426614174000 \
  --file request.json

# With custom headers
eendhan call 123e4567-e89b-12d3-a456-426614174000 \
  --payload '{"query": "test"}' \
  --header "X-Custom-Header=value"
```

**Output:**

```
→ Sending request to endpoint...
← Received 402 Payment Required
  Amount: 0.01 USDC
  Session: sess_abc123
→ Signing payment transaction...
→ Broadcasting to Algorand...
✓ Payment confirmed
← Response received (200 OK)

{
  "response": "Hello! How can I help you today?"
}
```

---

### `eendhan status`

Check rate limits and usage statistics.

```bash
eendhan status [options]
```

**Options:**
- `--endpoint <id>` - Check specific endpoint
- `--json` - JSON output

**Example:**

```bash
$ eendhan status

╔════════════════════════════════════════╗
║           RATE LIMIT STATUS             ║
╠════════════════════════════════════════╣
║  Request Rate:    100 req / min         ║
║  Burst Cap:      5 exec / 10s          ║
║  Velocity Cap:   $50 / 10 min           ║
║  Nonce Window:   60 seconds             ║
╠════════════════════════════════════════╣
║        CURRENT USAGE                   ║
╠════════════════════════════════════════╣
║  Requests:       12 / 100               ║
║  This Window:    $0.35 / $50            ║
║  Reset In:       8m 23s                 ║
╚════════════════════════════════════════╝
```

---

### `eendhan wallet`

Manage wallet connections.

#### Connect Wallet

```bash
eendhan wallet connect
```

Opens a browser window to connect your Algorand wallet (Pera, Defly, etc.)

#### Check Balance

```bash
eendhan wallet balance
```

Shows USDC balance and Algorand balance.

---

### `eendhan mandate`

Manage spending mandates (AI Agentic Wallet).

#### Create Mandate

```bash
eendhan mandate create [options]
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--max-txn` | Max per-transaction | 10 USDC |
| `--max-velocity` | Max per 10 min | 50 USDC |
| `--max-daily` | Max per 24 hours | 500 USDC |

**Example:**

```bash
$ eendhan mandate create \
  --max-txn 5 \
  --max-velocity 25 \
  --max-daily 200

✓ Mandate created
  Max Transaction:  5 USDC
  Max Velocity:    25 USDC / 10 min
  Max Daily:       200 USDC / 24 hr
```

#### List Mandates

```bash
eendhan mandate list
```

#### Revoke Mandate

```bash
eendhan mandate revoke <mandate-id>
```

---

### `eendhan config`

Manage configuration.

#### View Config

```bash
eendhan config view
```

#### Set Config Value

```bash
eendhan config set <key> <value>
```

**Example:**

```bash
eendhan config set backendUrl https://api.algogate.ai
eendhan config set defaultTier premium
```

---

## Configuration

### Config File Location

- Project: `./.eendhan/config.json`
- Global: `~/.eendhan/config.json`

### Config Structure

```json
{
  "version": "1.0.0",
  "backendUrl": "http://localhost:8000",
  "defaultTier": "basic",
  "slippageBips": 50,
  "endpoints": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "My AI",
      "tiers": {
        "basic": 10000,
        "premium": 50000
      }
    }
  ],
  "wallet": {
    "provider": "pera"
  }
}
```

---

## Examples

### Example 1: Create and Call an Endpoint

```bash
# 1. Create an endpoint
eendhan endpoint create \
  --title "AI Chat" \
  --price 0.01 \
  --url "https://api.example.com/chat"

# 2. Add multiple tiers
eendhan endpoint tiers add ENDPOINT_ID \
  --fast 0.005 \
  --standard 0.01 \
  --premium 0.02

# 3. Make a call
eendhan call ENDPOINT_ID \
  --payload '{"message": "Hello!"}' \
  --tier premium
```

### Example 2: Script Usage

```bash
#!/bin/bash
# Call AI endpoint with dynamic content

CONTENT="$1"
ENDPOINT="123e4567-e89b-12d3-a456-426614174000"

eendhan call "$ENDPOINT" \
  --payload "{\"prompt\": \"$CONTENT\"}" \
  --tier standard \
  --json | jq '.response'
```

### Example 3: Batch Processing

```bash
# Process multiple prompts from a file
while read prompt; do
  eendhan call ENDPOINT_ID \
    --payload "{\"prompt\": \"$prompt\"}" \
    --tier fast
done < prompts.txt
```

### Example 4: CI/CD Integration

```bash
# In your CI pipeline
eendhan init

# Run AI-powered tests
RESULT=$(eendhan call $ENDPOINT_ID \
  --payload '{"test": "regression", "suite": "auth"}' \
  --tier enterprise)

if echo "$RESULT" | jq -e '.success' > /dev/null; then
  echo "Tests passed"
  exit 0
else
  echo "Tests failed"
  exit 1
fi
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EENDHAN_BACKEND_URL` | Backend API URL | `http://localhost:8000` |
| `EENDHAN_WALLET_KEY` | Private key for signing | - |
| `EENDHAN_ENDPOINT_ID` | Default endpoint ID | - |
| `EENDHAN_TIER` | Default tier | `basic` |
| `EENDHAN_VERBOSE` | Enable verbose output | `false` |

**Example:**

```bash
export EENDHAN_BACKEND_URL=https://api.algogate.ai
export EENDHAN_ENDPOINT_ID=123e4567-e89b-12d3-a456-426614174000

# Now calls don't need --endpoint flag
eendhan call 123e4567-e89b-12d3-a456-426614174000 --payload '{}'
```

---

## Troubleshooting

### Common Issues

**"Wallet not connected"**
```bash
# Run this first to connect your wallet
eendhan wallet connect
```

**"Endpoint not found"**
```bash
# Verify endpoint exists
eendhan endpoint list

# Check endpoint ID is correct
eendhan endpoint show <your-id>
```

**"Payment failed - Insufficient USDC"**
- Make sure your wallet has USDC (Asset ID: 10458941 on Testnet)
- Get test USDC from: https://dispenser.testnet.algorand.network/

**"Rate limited (429)"**
- Wait 60 seconds before retrying
- Consider upgrading your plan

**"Velocity cap exceeded (402)"**
- You've spent $50 in the last 10 minutes
- Wait for the window to reset
- Use a lower tier for smaller requests

### Debug Mode

```bash
eendhan --verbose call <endpoint-id> --payload '{}'
```

Shows detailed logs including:
- Request/response headers
- Transaction details
- Payment verification steps

---

## Shell Autocomplete

### Bash

```bash
# Add to ~/.bashrc
source <(eendhan completion bash)
```

### Zsh

```bash
# Add to ~/.zshrc
source <(eendhan completion zsh)
```

### Fish

```bash
eendhan completion fish | source
```

---

## API Keys vs CLI

| Feature | CLI | API Key |
|---------|-----|---------|
| Wallet signing | ✓ | ✗ |
| Automatic 402 | ✓ | ✓ |
| Rate limiting | ✓ | ✓ |
| Mandates | ✓ | ✗ |
| Interactive | ✓ | ✗ |

---

## Support

- Discord: [Join community](https://discord.gg/algogate)
- GitHub: [Report issues](https://github.com/eendhan/cli/issues)
- Email: support@algogate.ai

---

## License

MIT License - See LICENSE file for details.