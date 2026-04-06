# EENDHAN SDK

The TypeScript/JavaScript SDK for integrating pay-per-use AI APIs powered by Algorand into your applications.

## Table of Contents
1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Payment Flow](#payment-flow)
5. [API Reference](#api-reference)
6. [Error Handling](#error-handling)
7. [React Integration](#react-integration)
8. [Node.js Integration](#nodejs-integration)
9. [Examples](#examples)
10. [Troubleshooting](#troubleshooting)

---

## Installation

### Prerequisites
- Node.js 18+
- An Algorand wallet (Pera, Defly, or Exodus)

### Install SDK

```bash
npm install @eendhan/sdk

# Peer dependencies
npm install algosdk @txnlab/use-wallet-react
```

---

## Quick Start

```typescript
import { EendhanClient } from '@eendhan/sdk';
import { useWallet } from '@txnlab/use-wallet-react';

// Inside a React component
const { activeAddress, signTransactions } = useWallet();

const client = new EendhanClient({
  endpointId: '123e4567-e89b-12d3-a456-426614174000',
  senderAddress: activeAddress!,
  signer: signTransactions,
  tier: 'basic',
});

const result = await client.call({ query: 'Hello AI!' });

// result.data     → JSON object, text, or image URL
// result.isImage  → true if response is an image
// result.txid     → Algorand transaction ID of the payment
```

The SDK automatically handles the complete x402 flow:
1. Sends initial request → receives 402 challenge
2. Builds USDC asset transfer transaction
3. Signs via wallet → broadcasts to Algorand TestNet
4. Submits payment proof → returns proxied AI response

---

## Configuration

```typescript
const client = new EendhanClient({
  // Required
  endpointId: '123e4567-e89b-12d3-a456-426614174000',
  senderAddress: 'YOUR_ALGORAND_ADDRESS',
  signer: signTransactions,

  // Optional
  backendUrl: 'https://your-backend.onrender.com', // Default: http://localhost:8000
  tier: 'premium',                                  // Default: basic
});
```

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `endpointId` | `string` | Yes | — | UUID from Creator Portal or CLI |
| `senderAddress` | `string` | Yes | — | Your Algorand wallet address |
| `signer` | `function` | Yes | — | Transaction signer (compatible with `@txnlab/use-wallet-react`) |
| `backendUrl` | `string` | No | `http://localhost:8000` | Backend API URL |
| `tier` | `string` | No | `basic` | Pricing tier name |

---

## Payment Flow

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Client   │ ───► │  Backend  │ ───► │  Wallet   │ ───► │  Backend  │
│  Request  │      │ 402 + x402│      │  Signs    │      │ Verifies  │
│           │      │ Challenge │      │  USDC Txn │      │ + Proxies │
└──────────┘      └──────────┘      └──────────┘      └──────────┘
     │                                                        │
     │                    AI Response                         │
     ◄────────────────────────────────────────────────────────┘
```

### Step-by-Step

1. **Request** — `POST /api/execute/:id` with `X-AI-Tier` header
2. **402 Challenge** — Backend returns session ID, cost (micro-USDC), receiver address, expiry
3. **Build Transaction** — SDK creates USDC asset transfer (`assetIndex: 10458941`)
4. **Sign** — Wallet signs the transaction (Pera/Defly popup)
5. **Broadcast** — SDK sends signed transaction to Algorand TestNet
6. **Verify** — SDK resubmits request with `X-Payment: tx64=<base64>, session=<id>` header
7. **Response** — Backend verifies payment, proxies to upstream, returns result

> This flow is identical to the frontend's GatewayTester component.

---

## API Reference

### `new EendhanClient(config)`

Create a new client instance.

### `client.call(payload): Promise<CallResult>`

Make a pay-per-use API call. Handles the full x402 payment flow automatically.

```typescript
const result = await client.call({ query: 'robot-1' });
```

**Returns `CallResult`:**

```typescript
interface CallResult {
  data: any;          // Response data (JSON, text object, or image URL object)
  contentType: string; // Content-Type header from upstream
  isImage: boolean;    // true if response was an image
  txid?: string;       // Algorand transaction ID (if payment was made)
}
```

**Response handling by content type:**

| Upstream Content-Type | `result.data` | `result.isImage` |
|---|---|---|
| `application/json` | Parsed JSON object | `false` |
| `image/*` | `{ imageUrl: "blob:...", note: "..." }` | `true` |
| `text/*` or other | `{ text: "..." }` | `false` |

---

### `client.setTier(tier: string): void`

Change the pricing tier for subsequent calls.

```typescript
client.setTier('premium');
```

---

### `client.getEndpointInfo(): Promise<EndpointInfo>`

Fetch endpoint details from the backend (`GET /api/endpoints/:id`).

```typescript
const info = await client.getEndpointInfo();
// {
//   endpointId: "123e4567-...",
//   title: "PFP Generator",
//   priceUsdc: 0.01,
//   pricingTiers: { basic: 10000, premium: 50000 },
//   targetUrl: "https://robohash.org/",
//   method: "GET",
//   creatorWallet: "TPXCOJ..."
// }
```

---

### `client.getPricing(): Promise<PricingInfo>`

Fetch pricing tiers for this endpoint.

```typescript
const pricing = await client.getPricing();
// {
//   tiers: [
//     { name: "basic", priceMicroUsdc: 10000, priceUsdc: 0.01 },
//     { name: "premium", priceMicroUsdc: 50000, priceUsdc: 0.05 }
//   ],
//   defaultTier: "basic"
// }
```

---

### `client.getVelocityStatus(): VelocityStatus`

Get current client-side velocity cap tracking.

```typescript
const status = client.getVelocityStatus();
// {
//   currentSpend: 10000,       // micro-USDC spent in current window
//   limit: 50000000,           // $50 limit in micro-USDC
//   windowSeconds: 600,        // 10-minute window
//   remaining: 49990000        // micro-USDC remaining
// }
```

---

### Types

```typescript
interface ClientConfig {
  endpointId: string;
  senderAddress: string;
  signer: (txns: Transaction[]) => Promise<(Uint8Array | null)[]>;
  backendUrl?: string;
  tier?: string;
}

interface CallResult {
  data: any;
  contentType: string;
  isImage: boolean;
  txid?: string;
}

interface PricingTier {
  name: string;
  priceMicroUsdc: number;  // 1 USDC = 1,000,000
  priceUsdc: number;
}

interface PricingInfo {
  tiers: PricingTier[];
  defaultTier: string;
}

interface VelocityStatus {
  currentSpend: number;
  limit: number;
  windowSeconds: number;
  remaining: number;
}

enum ErrorCode {
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  VELOCITY_CAPPED = 'VELOCITY_CAPPED',
  RATE_LIMITED = 'RATE_LIMITED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  UPSTREAM_FAILED = 'UPSTREAM_FAILED',
  UNKNOWN = 'UNKNOWN',
}
```

---

## Error Handling

### Error Codes

| Code | HTTP Status | Description | Recovery |
|------|-------------|-------------|----------|
| `PAYMENT_REQUIRED` | 402 | Payment needed | SDK handles automatically |
| `VELOCITY_CAPPED` | 402 | $50/10min limit exceeded | Wait for window reset |
| `RATE_LIMITED` | 429 | 100 req/min exceeded | Back off 60s and retry |
| `SESSION_EXPIRED` | 402 | 60s nonce expired | Re-request (automatic) |
| `VERIFICATION_FAILED` | 400 | Payment invalid | Retry payment |
| `UPSTREAM_FAILED` | 502 | Target API failed | Check endpoint URL |
| `UNKNOWN` | — | Other errors | Check message |

### Usage

```typescript
import { EendhanClient, EendhanError, ErrorCode } from '@eendhan/sdk';

try {
  const result = await client.call({ query: 'Hello' });
} catch (error) {
  if (error instanceof EendhanError) {
    switch (error.code) {
      case ErrorCode.VELOCITY_CAPPED:
        console.log('Spending limit reached. Wait 10 minutes.');
        break;
      case ErrorCode.RATE_LIMITED:
        console.log('Too many requests. Waiting 60s...');
        await new Promise(r => setTimeout(r, 60000));
        break;
      case ErrorCode.UPSTREAM_FAILED:
        console.log('Target API is down:', error.message);
        break;
      default:
        console.log('Error:', error.message);
    }
  }
}
```

---

## React Integration

### With `@txnlab/use-wallet-react`

This matches how the frontend GatewayTester works:

```tsx
import React, { useState } from 'react';
import { EendhanClient, CallResult, ErrorCode } from '@eendhan/sdk';
import { useWallet } from '@txnlab/use-wallet-react';

function AIProxy() {
  const { activeAddress, signTransactions } = useWallet();
  const [result, setResult] = useState<CallResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCall = async () => {
    if (!activeAddress) return;

    const client = new EendhanClient({
      endpointId: '123e4567-e89b-12d3-a456-426614174000',
      senderAddress: activeAddress,
      signer: signTransactions,
      tier: 'basic',
    });

    setLoading(true);
    setError('');

    try {
      const res = await client.call({ query: 'robot-1' });
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleCall} disabled={loading || !activeAddress}>
        {loading ? 'Processing...' : 'Call AI Endpoint'}
      </button>

      {result?.isImage && <img src={result.data.imageUrl} alt="AI Generated" />}
      {result && !result.isImage && <pre>{JSON.stringify(result.data, null, 2)}</pre>}
      {result?.txid && <p>Payment TX: {result.txid}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

### Custom React Hook

```typescript
import { useMemo } from 'react';
import { EendhanClient } from '@eendhan/sdk';
import { useWallet } from '@txnlab/use-wallet-react';

export function useEendhan(endpointId: string, tier = 'basic') {
  const { activeAddress, signTransactions } = useWallet();

  return useMemo(() => {
    if (!activeAddress) return null;
    return new EendhanClient({
      endpointId,
      senderAddress: activeAddress,
      signer: signTransactions,
      tier,
    });
  }, [endpointId, activeAddress, signTransactions, tier]);
}

// Usage:
// const client = useEendhan('123e4567-...', 'premium');
// const result = await client?.call({ prompt: 'Hello' });
```

---

## Node.js Integration

For server-side usage with a private key:

```typescript
import { EendhanClient } from '@eendhan/sdk';
import algosdk from 'algosdk';

const mnemonic = process.env.WALLET_MNEMONIC!;
const account = algosdk.mnemonicToSecretKey(mnemonic);

const signer = async (txns: algosdk.Transaction[]) => {
  return txns.map(txn => {
    const signedTxn = txn.signTxn(account.sk);
    return signedTxn;
  });
};

const client = new EendhanClient({
  endpointId: process.env.ENDPOINT_ID!,
  senderAddress: account.addr.toString(),
  signer,
  backendUrl: 'https://your-backend.onrender.com',
});

const result = await client.call({ query: 'Hello from server' });
console.log(result.data);
```

---

## Examples

### Example 1: Image Generation (Robohash / Pollinations)

```typescript
const result = await client.call({ query: 'futuristic-robot' });

if (result.isImage) {
  // Display image
  document.getElementById('img')!.src = result.data.imageUrl;
} else {
  console.log(result.data);
}
```

### Example 2: Fetch and Display Tiers

```typescript
const pricing = await client.getPricing();

pricing.tiers.forEach(tier => {
  console.log(`${tier.name}: ${tier.priceUsdc} USDC`);
});

// Switch to premium
client.setTier('premium');
const result = await client.call({ prompt: 'Hello' });
```

### Example 3: Velocity Cap Check

```typescript
const velocity = client.getVelocityStatus();
const remainingUsdc = velocity.remaining / 1_000_000;

if (remainingUsdc < 1) {
  console.log('Warning: Almost at velocity cap!');
}
```

---

## Troubleshooting

### Common Issues

**"Transaction rejected in wallet"**
- User cancelled the Pera/Defly popup
- Retry the call

**"Broadcast failed"**
- Wallet may not have enough ALGO for transaction fees
- Wallet may not have opted in to USDC (Asset ID: 10458941)

**"Verification failed"**
- Session may have expired (60s window)
- Retry — the SDK will get a fresh challenge

**"Velocity cap exceeded"**
- You've spent $50 in the last 10 minutes
- Wait for the window to reset

**"Endpoint not found"**
- Verify the endpoint ID matches one from the Creator Portal
- Check the backend URL is correct

---

## License

MIT License - See LICENSE file for details.