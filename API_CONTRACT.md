# AlgoGate AI - API Contract

This document outlines the JSON structures and endpoints for the AlgoGate AI backend. It serves as the single source of truth for the Front-End (Member 2), Back-End (Member 1), Blockchain (Member 3), and AI (Member 4) teams.

---

## 1. Endpoints Management

### 1.1 Create Endpoint
**POST** `/api/endpoints/create`

**Request Body:**
```json
{
  "creatorWallet": "string (Algorand Address)",
  "title": "string",
  "priceAlgo": 0.0,
  "systemPrompt": "string",
  "category": "string"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "endpointId": "uuid-string",
  "message": "Endpoint created successfully"
}
```

### 1.2 List Endpoints
**GET** `/api/endpoints`

**Response (200 OK):**
```json
{
  "endpoints": [
    {
      "endpointId": "uuid-string",
      "creatorWallet": "string (Algorand Address)",
      "title": "string",
      "priceAlgo": 0.0,
      "category": "string"
    }
  ]
}
```

---

## 2. x402 Payment Flow

### 2.1 Request Payment Challenge
**POST** `/api/x402/challenge`

Called when a consumer wants to use an endpoint.

**Request Body:**
```json
{
  "consumerWallet": "string (Algorand Address)",
  "endpointId": "uuid-string"
}
```

**Response (402 Payment Required / 200 OK):**
*Note: Depending on how axios/fetch is configured, returning 402 directly might throw an error. For mock purposes, standard JSON is fine.*
```json
{
  "sessionId": "uuid-string",
  "amountAlgo": 0.0,
  "targetWallet": "string (Algorand Address)",
  "nonce": "string-nonce",
  "message": "Payment Required"
}
```

### 2.2 Verify Payment & Execute Service
**POST** `/api/x402/verify`

Called after the Algorand transaction is signed and submitted to the network.

**Request Body:**
```json
{
  "sessionId": "uuid-string",
  "txHash": "string",
  "consumerInput": "string (e.g., resume text)"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "aiOutput": "string (e.g., feedback or reviewed resume text)"
}
```

**Response (400 Bad Request / 402 Payment Required - invalid tx):**
```json
{
  "status": "error",
  "message": "Transaction verification failed or expired"
}
```
