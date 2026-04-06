import * as fs from 'fs';
import * as path from 'path';

export interface Endpoint {
  id: string;
  title: string;
  description: string;
  targetUrl: string;
  method: string;
  pricingTiers: Record<string, number>; // tier name → micro-USDC (1 USDC = 1,000,000)
  creatorWallet: string;
  status: 'active' | 'inactive';
  created: string;
}

export interface Config {
  version: string;
  backendUrl: string;
  defaultTier: string;
  endpoints: Endpoint[];
}

const DEFAULT_CONFIG: Config = {
  version: '1.0.0',
  backendUrl: 'http://localhost:8000',
  defaultTier: 'basic',
  endpoints: [],
};

export class ConfigManager {
  private configPath: string;
  private eendhanDir: string;

  constructor(projectPath: string = process.cwd()) {
    this.eendhanDir = path.join(projectPath, '.eendhan');
    this.configPath = path.join(this.eendhanDir, 'config.json');
  }

  ensureDir(): void {
    if (!fs.existsSync(this.eendhanDir)) {
      fs.mkdirSync(this.eendhanDir, { recursive: true });
    }
  }

  loadConfig(): Config {
    if (!fs.existsSync(this.configPath)) {
      return { ...DEFAULT_CONFIG, endpoints: [] };
    }
    try {
      const data = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return { ...DEFAULT_CONFIG, endpoints: [] };
    }
  }

  saveConfig(config: Config): void {
    this.ensureDir();
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  addEndpoint(endpoint: Endpoint): void {
    const config = this.loadConfig();
    config.endpoints.push(endpoint);
    this.saveConfig(config);
  }

  getEndpoints(): Endpoint[] {
    return this.loadConfig().endpoints;
  }

  getEndpointById(id: string): Endpoint | undefined {
    return this.getEndpoints().find(e => e.id === id);
  }
}
