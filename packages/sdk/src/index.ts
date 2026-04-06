import * as algosdk from 'algosdk';

// ─── Error Codes ────────────────────────────────────────────────────────────────
export enum ErrorCode {
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  VELOCITY_CAPPED = 'VELOCITY_CAPPED',
  RATE_LIMITED = 'RATE_LIMITED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  UPSTREAM_FAILED = 'UPSTREAM_FAILED',
  UNKNOWN = 'UNKNOWN',
}

// ─── Interfaces ─────────────────────────────────────────────────────────────────
export interface ClientConfig {
  /** UUID endpoint ID from the Creator Portal */
  endpointId: string;
  /** Backend URL (default: http://localhost:8000) */
  backendUrl?: string;
  /** Pricing tier to use (default: basic) */
  tier?: string;
  /** Wallet address of the sender (consumer) */
  senderAddress: string;
  /**
   * Transaction signer — matches @txnlab/use-wallet-react signTransactions.
   * Receives an array of unsigned transactions, returns array of signed Uint8Arrays.
   */
  signer: (txns: algosdk.Transaction[]) => Promise<(Uint8Array | null)[]>;
}

export interface PricingTier {
  name: string;
  /** Price in micro-USDC (1 USDC = 1,000,000) */
  priceMicroUsdc: number;
  /** Price in USDC */
  priceUsdc: number;
}

export interface EndpointInfo {
  endpointId: string;
  title: string;
  description?: string;
  priceUsdc: number;
  pricingTiers: Record<string, number>;
  targetUrl: string;
  method: string;
  creatorWallet?: string;
}

export interface PricingInfo {
  tiers: PricingTier[];
  defaultTier: string;
}

export interface VelocityStatus {
  currentSpend: number;
  limit: number;
  windowSeconds: number;
  remaining: number;
}

export interface CallResult {
  /** The response data (JSON, text, or image blob URL) */
  data: any;
  /** Content type of the response */
  contentType: string;
  /** Whether the response is an image */
  isImage: boolean;
  /** Transaction ID of the payment (if payment was made) */
  txid?: string;
}

// ─── Error Class ────────────────────────────────────────────────────────────────
export class EendhanError extends Error {
  code: ErrorCode;
  status?: number;

  constructor(message: string, code: ErrorCode, status?: number) {
    super(message);
    this.name = 'EendhanError';
    this.code = code;
    this.status = status;
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────────
const USDC_ASSET_ID = 10458941;
const ALGOD_SERVER = 'https://testnet-api.algonode.cloud';
const DEFAULT_RECEIVER = 'TPXCOJSONCOKFZDP76S2XR5HU4SISWOXUXFWRSOT2HL3V7TYRCZD7BXWYY';
const VELOCITY_WINDOW_MS = 600_000; // 10 minutes
const VELOCITY_LIMIT = 50_000_000; // $50 in micro-USDC

// ─── Client ─────────────────────────────────────────────────────────────────────
export class EendhanClient {
  private endpointId: string;
  private backendUrl: string;
  private tier: string;
  private senderAddress: string;
  private signer: (txns: algosdk.Transaction[]) => Promise<(Uint8Array | null)[]>;
  private algodClient: algosdk.Algodv2;

  // Velocity tracking (client-side)
  private velocitySpent: number = 0;
  private velocityWindowStart?: number;

  constructor(config: ClientConfig) {
    this.endpointId = config.endpointId;
    this.backendUrl = (config.backendUrl || 'http://localhost:8000').replace(/\/$/, '');
    this.tier = config.tier || 'basic';
    this.senderAddress = config.senderAddress;
    this.signer = config.signer;
    this.algodClient = new algosdk.Algodv2('', ALGOD_SERVER, '');
  }

  /**
   * Set the pricing tier for subsequent calls.
   */
  setTier(tier: string): void {
    this.tier = tier;
  }

  /**
   * Make a pay-per-use API call through the x402 gateway.
   * Handles the full flow: initial request → 402 challenge → payment → verification → response.
   */
  async call(payload: any): Promise<CallResult> {
    // Step 1: Initial request to the gateway
    const response = await fetch(`${this.backendUrl}/api/execute/${this.endpointId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Tier': this.tier,
      },
      body: JSON.stringify(payload),
    });

    // Rate limited
    if (response.status === 429) {
      throw new EendhanError(
        'Rate limited. Please wait 60 seconds and retry.',
        ErrorCode.RATE_LIMITED,
        429
      );
    }

    // Payment required — initiate x402 flow
    if (response.status === 402) {
      const challenge = await response.json();

      // Check velocity cap
      if (challenge.velocityCapped) {
        throw new EendhanError(
          `Velocity cap exceeded: ${challenge.currentSpend / 1_000_000} USDC / $50 limit`,
          ErrorCode.VELOCITY_CAPPED,
          402
        );
      }

      return this.handlePaymentFlow(challenge, payload);
    }

    // Direct success (unlikely but possible if endpoint doesn't require payment)
    if (response.ok) {
      return this.parseResponse(response);
    }

    // Upstream failure
    if (response.status === 502) {
      const err = await response.json().catch(() => ({}));
      throw new EendhanError(
        `Upstream failed: ${(err as any).reason || response.statusText}`,
        ErrorCode.UPSTREAM_FAILED,
        502
      );
    }

    throw new EendhanError(
      `Request failed: ${response.statusText}`,
      ErrorCode.UNKNOWN,
      response.status
    );
  }

  /**
   * Handle the x402 payment flow — matches GatewayTester handlePaymentFlow exactly.
   */
  private async handlePaymentFlow(challenge: any, payload: any): Promise<CallResult> {
    const conditions = challenge.x402?.conditions ?? {};
    const sessionId = challenge.sessionId ?? 'no-session';

    // Build USDC asset transfer transaction (same as GatewayTester)
    const suggestedParams = await this.algodClient.getTransactionParams().do();

    // Enforce on-chain expiration if provided
    if (challenge.lastRound) {
      (suggestedParams as any).lastRound = challenge.lastRound;
    }

    const ptxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: this.senderAddress,
      receiver: conditions.receiver ?? DEFAULT_RECEIVER,
      assetIndex: USDC_ASSET_ID,
      amount: conditions.amount ?? 1_000_000, // micro-USDC (1 USDC default)
      suggestedParams,
    });

    // Sign transaction via the provided signer
    const signedTxns = await this.signer([ptxn]);
    if (!signedTxns[0]) {
      throw new EendhanError('Transaction rejected in wallet.', ErrorCode.UNKNOWN);
    }
    const signedTxn = signedTxns[0];

    // Broadcast to Algorand TestNet
    let txid: string;
    try {
      const broadcastResult = await this.algodClient.sendRawTransaction(signedTxn).do() as any;
      txid = broadcastResult.txid;
    } catch (e: any) {
      throw new EendhanError(
        `Broadcast failed: ${e?.message || e}`,
        ErrorCode.VERIFICATION_FAILED
      );
    }

    // Submit payment proof to gateway (X-Payment header — matches GatewayTester)
    const signedTxnBase64 = Buffer.from(signedTxn).toString('base64');

    const verifyResponse = await fetch(`${this.backendUrl}/api/execute/${this.endpointId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment': `tx64=${signedTxnBase64}, session=${sessionId}`,
      },
      body: JSON.stringify(payload),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json().catch(() => ({}));
      const detail = (error as any).detail || (error as any).message || verifyResponse.statusText;
      throw new EendhanError(
        `Verification failed: ${detail}`,
        ErrorCode.VERIFICATION_FAILED,
        verifyResponse.status
      );
    }

    // Track velocity spending
    this.velocitySpent += conditions.amount || 0;
    if (!this.velocityWindowStart) {
      this.velocityWindowStart = Date.now();
    }

    const result = await this.parseResponse(verifyResponse);
    result.txid = txid;
    return result;
  }

  /**
   * Parse the gateway response — handles JSON, images, and text (like GatewayTester).
   */
  private async parseResponse(response: Response): Promise<CallResult> {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return {
        data: await response.json(),
        contentType,
        isImage: false,
      };
    }

    if (contentType.startsWith('image/')) {
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      return {
        data: { imageUrl, note: 'Image generated via AlgoGate proxy' },
        contentType,
        isImage: true,
      };
    }

    return {
      data: { text: await response.text() },
      contentType,
      isImage: false,
    };
  }

  /**
   * Fetch endpoint info and pricing tiers from the backend.
   */
  async getEndpointInfo(): Promise<EndpointInfo> {
    const response = await fetch(`${this.backendUrl}/api/endpoints/${this.endpointId}`);
    if (!response.ok) {
      throw new EendhanError('Endpoint not found', ErrorCode.UNKNOWN, response.status);
    }
    return await response.json();
  }

  /**
   * Fetch available pricing tiers for this endpoint.
   */
  async getPricing(): Promise<PricingInfo> {
    const info = await this.getEndpointInfo();

    const tiers: PricingTier[] = [];
    if (info.pricingTiers && Object.keys(info.pricingTiers).length > 0) {
      for (const [name, microUsdc] of Object.entries(info.pricingTiers)) {
        tiers.push({
          name,
          priceMicroUsdc: microUsdc,
          priceUsdc: microUsdc / 1_000_000,
        });
      }
    } else {
      tiers.push({
        name: 'basic',
        priceMicroUsdc: Math.round((info.priceUsdc || 0.01) * 1_000_000),
        priceUsdc: info.priceUsdc || 0.01,
      });
    }

    return { tiers, defaultTier: tiers[0]?.name || 'basic' };
  }

  /**
   * Get the current velocity cap status (client-side tracking).
   */
  getVelocityStatus(): VelocityStatus {
    // Reset window if expired
    if (!this.velocityWindowStart || Date.now() - this.velocityWindowStart > VELOCITY_WINDOW_MS) {
      this.velocitySpent = 0;
      this.velocityWindowStart = undefined;
    }

    return {
      currentSpend: this.velocitySpent,
      limit: VELOCITY_LIMIT,
      windowSeconds: 600,
      remaining: VELOCITY_LIMIT - this.velocitySpent,
    };
  }
}

export default EendhanClient;