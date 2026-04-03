import * as algosdk from 'algosdk';

export enum ErrorCode {
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  VELOCITY_CAPPED = 'VELOCITY_CAPPED',
  RATE_LIMITED = 'RATE_LIMITED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  UNKNOWN = 'UNKNOWN',
}

export interface ClientConfig {
  endpointId: string;
  backendUrl?: string;
  tier?: string;
  signer?: (txns: Uint8Array[]) => Promise<Uint8Array[]>;
  slippageBips?: number;
}

export interface PricingInfo {
  tiers: Record<string, number>;
  defaultTier: string;
}

export interface VelocityStatus {
  currentSpend: number;
  limit: number;
  windowSeconds: number;
}

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

const USDC_ASSET_ID = 10458941;

export class EendhanClient {
  private endpointId: string;
  private backendUrl: string;
  private tier: string;
  private signer?: (txns: Uint8Array[]) => Promise<Uint8Array[]>;
  private slippageBips: number;
  private sessionId?: string;
  private velocitySpent: number = 0;
  private velocityWindowStart?: number;

  constructor(config: ClientConfig) {
    this.endpointId = config.endpointId;
    this.backendUrl = config.backendUrl || 'http://localhost:8000';
    this.tier = config.tier || 'basic';
    this.signer = config.signer;
    this.slippageBips = config.slippageBips || 50;
  }

  async call(payload: any): Promise<any> {
    const response = await fetch(`${this.backendUrl}/api/execute/${this.endpointId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Tier': this.tier,
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 429) {
      throw new EendhanError('Rate limited, please retry after 60 seconds', ErrorCode.RATE_LIMITED, 429);
    }

    if (response.status === 402) {
      const challenge = await response.json();

      if (challenge.velocityCapped) {
        throw new EendhanError(
          `Velocity cap exceeded: ${challenge.currentSpend / 1000000} USDC`,
          ErrorCode.VELOCITY_CAPPED,
          402
        );
      }

      return this.handlePaymentFlow(challenge, payload);
    }

    if (!response.ok) {
      throw new EendhanError(`Request failed: ${response.statusText}`, ErrorCode.UNKNOWN, response.status);
    }

    return response.json();
  }

  private async handlePaymentFlow(challenge: any, payload: any): Promise<any> {
    if (!this.signer) {
      throw new EendhanError('No signer configured', ErrorCode.UNKNOWN);
    }

    const conditions = challenge.x402?.conditions || {};
    this.sessionId = challenge.sessionId;

    const txn = await this.buildPaymentTxn(conditions);
    const signedTxn = await this.signer([txn]);
    
    const signedTxnBase64 = Buffer.from(signedTxn[0]).toString('base64');

    const verifyResponse = await fetch(`${this.backendUrl}/api/execute/${this.endpointId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Tier': this.tier,
        'X-Payment': `tx64=${signedTxnBase64}, session=${this.sessionId}`,
      },
      body: JSON.stringify(payload),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      throw new EendhanError(error.detail || 'Payment verification failed', ErrorCode.VERIFICATION_FAILED, verifyResponse.status);
    }

    this.velocitySpent += conditions.amount || 0;
    this.velocityWindowStart = Date.now();

    return verifyResponse.json();
  }

  private async buildPaymentTxn(conditions: any): Promise<Uint8Array> {
    const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
    const params = await algodClient.getTransactionParams().do();

    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: '',
      receiver: conditions.receiver || '',
      assetIndex: USDC_ASSET_ID,
      amount: conditions.amount || 1000000,
      suggestedParams: params,
    });

    return txn.toByte();
  }

  async getPricing(): Promise<PricingInfo> {
    const response = await fetch(`${this.backendUrl}/api/endpoints`);
    const data = await response.json();
    
    const endpoint = data.endpoints?.find((e: any) => e.endpointId === this.endpointId);
    if (!endpoint) {
      throw new EendhanError('Endpoint not found', ErrorCode.UNKNOWN, 404);
    }

    return {
      tiers: endpoint.pricingTiers || { basic: 10000 },
      defaultTier: 'basic',
    };
  }

  getVelocityStatus(): VelocityStatus {
    if (!this.velocityWindowStart || Date.now() - this.velocityWindowStart > 600000) {
      this.velocitySpent = 0;
      this.velocityWindowStart = undefined;
    }

    return {
      currentSpend: this.velocitySpent,
      limit: 50000000, // $50
      windowSeconds: 600,
    };
  }
}

export default EendhanClient;