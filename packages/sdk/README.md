# EENDHAN SDK - Complete Guide

The JavaScript/TypeScript SDK for integrating pay-per-use AI APIs into your applications.

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

---

## Installation

### Prerequisites
- Node.js 18+
- An Algorand wallet (Pera, Defly, or Exodus)

### Install SDK

```bash
# npm
npm install @eendhan/sdk

# yarn
yarn add @eendhan/sdk

# pnpm
pnpm add @eendhan/sdk
```

### Peer Dependencies

If using with `@txnlab/use-wallet-react`:

```bash
npm install algosdk @txnlab/use-wallet-react
```

---

## Quick Start

### 1. Import and Initialize

```typescript
import { EendhanClient } from '@eendhan/sdk';

const client = new EendhanClient({
  endpointId: 'your-endpoint-id',
});
```

### 2. Make API Calls

The SDK automatically handles the 402 payment flow:

```typescript
const response = await client.call({
  query: 'Hello, AI!',
});

console.log(response);
```

That's it! The SDK will:
- Detect 402 responses
- Prompt wallet for payment signature
- Submit payment proof
- Return the AI response

---

## Configuration

### Full Configuration Options

```typescript
const client = new EendhanClient({
  // Required
  endpointId: '123e4567-e89b-12d3-a456-426614174000',
  
  // Optional
  backendUrl: 'https://api.algogate.ai',  // Default: http://localhost:8000
  tier: 'premium',                         // Your custom tier name
  slippageBips: 50,                       // 5% slippage (default: 50 = 0.5%)
  timeout: 30000,                          // Request timeout in ms
  
  // For custom wallet integration
  signer: async (txns: Uint8Array[]) => {
    // Return signed transactions
  },
});
```

### Configuration Table

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|--------------|
| `endpointId` | string | Yes | - | Your registered endpoint ID |
| `backendUrl` | string | No | `http://localhost:8000` | Backend API URL |
| `tier` | string | No | `basic` | Pricing tier name |
| `signer` | function | No | - | Custom transaction signer |
| `slippageBips` | number | No | 50 | Slippage tolerance (basis points) |
| `timeout` | number | No | 30000 | Request timeout in milliseconds |

---

## Payment Flow

Here's what happens under the hood:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client   │ ──► │   Backend   │ ──► │   Wallet    │ ──► │   Backend   │
│   Request  │     │  402 Response│    │   Signs     │     │  Verifies   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Step-by-Step Flow

1. **Request**: Send API call with `X-AI-Tier` header
2. **Challenge**: If payment required, backend returns 402 with:
   - `sessionId` - Payment session
   - `amount` - Cost in micro-USDC
   - `receiver` - Destination wallet
   - `expiresAt` - Session expiration
3. **Sign**: SDK builds USDC asset transfer transaction
4. **Verify**: Wallet signs, SDK submits payment proof
5. **Response**: Backend verifies and returns AI result

### Manual Payment Flow

If you need more control:

```typescript
// 1. Get payment challenge
const challenge = await client.getChallenge();

if (challenge.status === 402) {
  // 2. Build and sign transaction
  const signedTxn = await client.signPayment(challenge);
  
  // 3. Submit proof
  const result = await client.verifyPayment(signedTxn, challenge.sessionId);
}
```

---

## API Reference

### Constructor

```typescript
new EendhanClient(config: ClientConfig)
```

### Methods

#### `client.call(payload)`

Make an API call with automatic payment handling.

```typescript
const result = await client.call({
  query: 'Your prompt here',
  // ... any other fields
});
```

**Parameters:**
- `payload` (any): Request body sent to the API

**Returns:** `Promise<any>` - API response

**Throws:** `EendhanError` on failure

---

#### `client.getPricing()`

Get pricing information for the endpoint.

```typescript
const pricing = await client.getPricing();

console.log(pricing);
// {
//   tiers: { basic: 10000, premium: 50000 },
//   defaultTier: 'basic'
// }
```

**Returns:** `Promise<PricingInfo>`

---

#### `client.getVelocityStatus()`

Check current velocity cap usage.

```typescript
const status = await client.getVelocityStatus();

console.log(status);
// {
//   currentSpend: 1000000,
//   limit: 50000000,  // $50 in micro-USDC
//   windowSeconds: 600
// }
```

**Returns:** `VelocityStatus`

---

#### `client.getChallenge()`

Manually get a payment challenge without making the full request.

```typescript
const challenge = await client.getChallenge({
  query: 'test',
});

if (challenge.status === 402) {
  // Handle payment
}
```

---

#### `client.signPayment(challenge)`

Sign a payment transaction from a challenge.

```typescript
const signedTxn = await client.signPayment(challenge);
// Returns base64 encoded signed transaction
```

---

#### `client.verifyPayment(signedTxn, sessionId)`

Submit payment proof.

```typescript
const result = await client.verifyPayment(signedTxn, sessionId);
```

---

### Types

```typescript
interface ClientConfig {
  endpointId: string;
  backendUrl?: string;
  tier?: string;
  signer?: (txns: Uint8Array[]) => Promise<Uint8Array[]>;
  slippageBips?: number;
  timeout?: number;
}

interface PricingInfo {
  tiers: Record<string, number>;  // tier name -> micro-USDC
  defaultTier: string;
}

interface VelocityStatus {
  currentSpend: number;   // micro-USDC spent
  limit: number;          // micro-USDC limit
  windowSeconds: number;  // remaining time
}

enum ErrorCode {
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  VELOCITY_CAPPED = 'VELOCITY_CAPPED',
  RATE_LIMITED = 'RATE_LIMITED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  UNKNOWN = 'UNKNOWN',
}
```

---

## Error Handling

### Error Codes

| Code | HTTP Status | Description | Recovery |
|------|-------------|--------------|-----------|
| `PAYMENT_REQUIRED` | 402 | Payment needed | Complete payment flow |
| `VELOCITY_CAPPED` | 402 | $50/10min exceeded | Wait for window reset |
| `RATE_LIMITED` | 429 | 100 req/min exceeded | Back off 60s and retry |
| `SESSION_EXPIRED` | 402 | 60s nonce expired | Re-request challenge |
| `VERIFICATION_FAILED` | 400 | Payment invalid | Retry payment |
| `UNKNOWN` | - | Other errors | Check message |

### Handling Errors

```typescript
import { EendhanClient, EendhanError, ErrorCode } from '@eendhan/sdk';

try {
  const result = await client.call({ query: 'Hello' });
} catch (error) {
  if (error instanceof EendhanError) {
    switch (error.code) {
      case ErrorCode.VELOCITY_CAPPED:
        // Show user they've hit the limit
        console.log('Spending limit reached. Wait and retry.');
        // Show when they can retry
        const waitTime = 600 - elapsedSeconds;
        break;
        
      case ErrorCode.RATE_LIMITED:
        // Implement exponential backoff
        await sleep(60000);
        break;
        
      case ErrorCode.SESSION_EXPIRED:
        // Simply retry - SDK will get new challenge
        break;
        
      default:
        console.log('Error:', error.message);
    }
  }
}
```

---

## React Integration

### Basic React Component

```tsx
import React, { useState } from 'react';
import { EendhanClient } from '@eendhan/sdk';
import { useWallet } from '@txnlab/use-wallet-react';

function AIChat() {
  const { signTransactions } = useWallet();
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  
  const client = new EendhanClient({
    endpointId: '123e4567-e89b-12d3-a456-426614174000',
    signer: signTransactions,
    tier: 'premium',
  });

  const handleSend = async (message: string) => {
    setLoading(true);
    try {
      const result = await client.call({
        messages: [{ role: 'user', content: message }],
      });
      setResponse(result.response);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input onChange={e => handleSend(e.target.value)} />
      {loading && <span>Loading...</span>}
      {response && <div>{response}</div>}
    </div>
  );
}
```

### React Hook

```typescript
import { useMemo } from 'react';
import { EendhanClient } from '@eendhan/sdk';
import { useWallet } from '@txnlab/use-wallet-react';

function useEendhan(endpointId: string, tier?: string) {
  const { signTransactions } = useWallet();
  
  return useMemo(() => {
    return new EendhanClient({
      endpointId,
      tier,
      signer: signTransactions,
    });
  }, [endpointId, tier, signTransactions]);
}

// Usage
function Component() {
  const client = useEendhan('endpoint-id', 'premium');
  
  const handleClick = async () => {
    const result = await client.call({ prompt: 'Hello' });
    console.log(result);
  };
  
  return <button onClick={handleClick}>Call AI</button>;
}
```

---

## Node.js Integration

### Server-Side Usage

For server-side calls, you'll need to handle signing differently:

```typescript
import { EendhanClient } from '@eendhan/sdk';
import algosdk from 'algosdk';

// Use a private key signer
const privateKey = process.env.WALLET_PRIVATE_KEY;
const account = algosdk.mnemonicToSecretKey(
  algosdk.secretKeyToMnemonic(
    Uint8Array.from(Buffer.from(privateKey, 'base64'))
  )
);

const signer = async (txns: Uint8Array[]): Promise<Uint8Array[]> => {
  return txns.map(txn => {
    const tx = algosdk.decodeSignedTransaction(txn);
    return algosdk.signTransaction(txn, account.sk).blob;
  });
};

const client = new EendhanClient({
  endpointId: process.env.ENDPOINT_ID,
  signer,
});

// Make calls
const result = await client.call({ query: 'Hello AI' });
```

### Next.js API Route

```typescript
// pages/api/ai.ts
import { EendhanClient } from '@eendhan/sdk';

export default async function handler(req, res) {
  const client = new EendhanClient({
    endpointId: process.env.ENDPOINT_ID,
    signer: getSigner(), // Your signer function
  });

  try {
    const result = await client.call(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}
```

---

## Examples

### Example 1: Simple Chat

```typescript
const client = new EendhanClient({
  endpointId: 'my-chat-endpoint',
  tier: 'premium',
});

const response = await client.call({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is Algorand?' },
  ],
});

console.log(response.choices[0].message.content);
```

### Example 2: Image Generation

```typescript
const client = new EendhanClient({
  endpointId: 'my-image-endpoint',
  tier: 'high-res',
});

const response = await client.call({
  prompt: 'A futuristic city with flying cars',
  size: '1024x1024',
  style: 'digital-art',
});

console.log(response.image_url);
```

### Example 3: Code Completion

```typescript
const client = new EendhanClient({
  endpointId: 'my-code-endpoint',
  tier: 'fast',
});

const response = await client.call({
  prefix: 'function fibonacci(n) {',
  language: 'javascript',
  max_tokens: 100,
});

console.log(response.completion);
```

### Example 4: Custom Error Handling UI

```typescript
function handleAPIError(error) {
  if (error.code === 'VELOCITY_CAPPED') {
    return {
      title: 'Spending Limit Reached',
      message: `You've used ${(error.velocitySpent / 1000000).toFixed(2)} USDC of your $50 limit.`,
      action: 'Try again in ' + error.remainingTime + ' seconds',
      type: 'warning',
    };
  }
  
  if (error.code === 'RATE_LIMITED') {
    return {
      title: 'Too Many Requests',
      message: 'Please wait a moment before making another request.',
      action: 'Retrying automatically...',
      type: 'info',
    };
  }
  
  return {
    title: 'Something went wrong',
    message: error.message,
    action: 'Try again',
    type: 'error',
  };
}
```

---

## Troubleshooting

### Common Issues

**"No signer configured"**
- Ensure you're using `useWallet` in React
- Or provide a custom signer function

**"Payment verification failed"**
- Check wallet has enough USDC (10458941 on Testnet)
- Verify session hasn't expired (60s)

**"Velocity cap exceeded"**
- Wait for 10-minute window to reset
- Consider upgrading to higher tier

**"Endpoint not found"**
- Verify endpoint ID is correct
- Check endpoint is active in dashboard

---

## Support

- Discord: [Join our community](https://discord.gg/algogate)
- Email: support@algogate.ai
- GitHub: [Report issues](https://github.com/eendhan/sdk/issues)

---

## License

MIT License - See LICENSE file for details.