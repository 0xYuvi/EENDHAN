#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import * as crypto from 'crypto';
import { ConfigManager, Endpoint } from './config';

const program = new Command();
const configManager = new ConfigManager();

const ALGOGATE_ASCII = String.raw`
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
`;

// Helper: convert USDC to micro-USDC
const toMicroUsdc = (usdc: number): number => Math.round(usdc * 1_000_000);
const fromMicroUsdc = (micro: number): string => (micro / 1_000_000).toFixed(4);

program
  .name('eendhan')
  .description('CLI for EENDHAN (AlgoGate) pay-per-use AI API system')
  .version('1.0.0');

// ─── INIT ───────────────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Initialize a new EENDHAN endpoint')
  .action(async () => {
    console.log(chalk.cyan(ALGOGATE_ASCII));
    console.log(chalk.cyan('Initializing new EENDHAN endpoint...\n'));

    // Step 1: Basic info
    const basics = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'API Name / Title:',
        validate: (input) => input.length > 0 || 'Title is required',
      },
      {
        type: 'input',
        name: 'description',
        message: 'Brief Description:',
        default: '',
      },
      {
        type: 'input',
        name: 'targetUrl',
        message: 'Your Target URL:',
        validate: (input) => input.startsWith('http') || 'URL must start with http/https',
      },
      {
        type: 'list',
        name: 'method',
        message: 'HTTP Method:',
        choices: ['POST', 'GET', 'PUT'],
        default: 'POST',
      },
    ]);

    // Step 2: Pricing Tiers (dynamic, like frontend)
    console.log(chalk.cyan('\n── Pricing Tiers ──'));
    console.log(chalk.gray('  Add your pricing tiers. Prices are in USDC.'));
    console.log(chalk.gray('  Frontend default: basic = 0.01 USDC\n'));

    const tiers: Record<string, number> = {};
    let addMore = true;
    let tierCount = 0;

    while (addMore) {
      const defaultName = tierCount === 0 ? 'basic' : tierCount === 1 ? 'premium' : `tier${tierCount + 1}`;
      const defaultPrice = tierCount === 0 ? '0.01' : '0.05';

      const tierAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: `Tier ${tierCount + 1} name:`,
          default: defaultName,
          validate: (input) => {
            if (input.length === 0) return 'Tier name is required';
            if (tiers[input] !== undefined) return 'Tier name already exists';
            return true;
          },
        },
        {
          type: 'input',
          name: 'price',
          message: `Tier ${tierCount + 1} price (USDC):`,
          default: defaultPrice,
          validate: (input) => {
            const num = parseFloat(input);
            if (isNaN(num) || num <= 0) return 'Price must be a positive number';
            return true;
          },
        },
      ]);

      tiers[tierAnswers.name] = toMicroUsdc(parseFloat(tierAnswers.price));
      tierCount++;

      const { more } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'more',
          message: 'Add another tier?',
          default: tierCount < 2,
        },
      ]);
      addMore = more;
    }

    // Step 3: Endpoint ID
    const defaultId = crypto.randomUUID();
    const { endpointId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'endpointId',
        message: 'Endpoint ID (UUID):',
        default: defaultId,
        validate: (input) => input.length > 0 || 'ID is required',
      },
    ]);

    // Build endpoint (matching backend CreateEndpointReq)
    const baseTierPrice = Object.values(tiers)[0];
    const endpoint: Endpoint = {
      id: endpointId,
      title: basics.title,
      description: basics.description,
      targetUrl: basics.targetUrl,
      method: basics.method,
      pricingTiers: tiers,
      creatorWallet: '',
      status: 'active',
      created: new Date().toISOString(),
    };

    configManager.addEndpoint(endpoint);

    // Summary
    console.log(chalk.green('\n✓ Endpoint registered locally!'));
    console.log(chalk.white(`  Title:       ${endpoint.title}`));
    console.log(chalk.white(`  ID:          ${endpoint.id}`));
    console.log(chalk.white(`  Target:      ${endpoint.method} ${endpoint.targetUrl}`));
    console.log(chalk.cyan('  Tiers:'));
    Object.entries(tiers).forEach(([name, microUsdc]) => {
      console.log(chalk.white(`    ${name.padEnd(15)} → ${fromMicroUsdc(microUsdc)} USDC`));
    });
    console.log(chalk.yellow('\nRun: eendhan endpoints list'));
  });

// ─── ENDPOINTS ──────────────────────────────────────────────────────────────────
const endpointCmd = program
  .command('endpoints')
  .description('Manage API endpoints');

endpointCmd
  .command('list')
  .description('List all configured endpoints')
  .action(() => {
    const endpoints = configManager.getEndpoints();

    if (endpoints.length === 0) {
      console.log(chalk.cyan('Your Endpoints:'));
      console.log(chalk.gray('No endpoints configured yet.'));
      console.log(chalk.yellow('Run: eendhan init'));
      return;
    }

    console.log(chalk.cyan('\n┌─ Your Endpoints ─────────────────────────────────────────────────────┐'));
    endpoints.forEach((e, index) => {
      if (index > 0) console.log(chalk.gray('├──────────────────────────────────────────────────────────────────────┤'));
      console.log(`  ${chalk.green(e.title)}`);
      console.log(`  ${chalk.gray('ID:')}     ${chalk.blue(e.id)}`);
      console.log(`  ${chalk.gray('Target:')} ${chalk.white(e.method)} ${chalk.white(e.targetUrl)}`);
      if (e.pricingTiers && Object.keys(e.pricingTiers).length > 0) {
        const tierStr = Object.entries(e.pricingTiers)
          .map(([k, v]) => `${chalk.cyan(k)}: ${chalk.yellow(fromMicroUsdc(v))} USDC`)
          .join('  ·  ');
        console.log(`  ${chalk.gray('Tiers:')}  ${tierStr}`);
      }
      console.log(`  ${chalk.gray('Status:')} ${e.status === 'active' ? chalk.green('● Active') : chalk.red('○ Inactive')}`);
    });
    console.log(chalk.cyan('└──────────────────────────────────────────────────────────────────────┘'));
  });

// ─── CALL ───────────────────────────────────────────────────────────────────────
program
  .command('call <endpoint-id>')
  .description('Call an endpoint via the x402 gateway')
  .option('-p, --payload <json>', 'Request payload as JSON')
  .option('-t, --tier <tier>', 'Pricing tier', 'basic')
  .action(async (endpointId: string, options: any) => {
    const endpoint = configManager.getEndpointById(endpointId);

    if (!endpoint) {
      console.log(chalk.red(`✗ Endpoint not found: ${endpointId}`));
      console.log(chalk.yellow('Run: eendhan endpoints list'));
      return;
    }

    console.log(chalk.cyan(`\n→ Calling endpoint: ${endpoint.title}`));
    console.log(chalk.gray(`  ID:     ${endpoint.id}`));
    console.log(chalk.gray(`  Target: ${endpoint.method} ${endpoint.targetUrl}`));
    console.log(chalk.gray(`  Tier:   ${options.tier}`));

    // Validate tier exists
    if (endpoint.pricingTiers && !endpoint.pricingTiers[options.tier]) {
      const available = Object.keys(endpoint.pricingTiers).join(', ');
      console.log(chalk.red(`\n✗ Tier "${options.tier}" not found. Available: ${available}`));
      return;
    }

    const tierCost = endpoint.pricingTiers?.[options.tier];
    if (tierCost) {
      console.log(chalk.gray(`  Cost:   ${fromMicroUsdc(tierCost)} USDC`));
    }

    let payload = {};
    if (options.payload) {
      try {
        payload = JSON.parse(options.payload);
      } catch {
        console.log(chalk.red('✗ Invalid JSON payload'));
        process.exit(1);
      }
    }

    console.log(chalk.yellow('\n  Payload:'), JSON.stringify(payload, null, 2));

    const config = configManager.loadConfig();
    const backendUrl = config.backendUrl.replace(/\/$/, '');

    console.log(chalk.cyan(`\n→ Sending to ${backendUrl}/api/execute/${endpoint.id}...`));

    try {
      const resp = await fetch(`${backendUrl}/api/execute/${endpoint.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AI-Tier': options.tier,
        },
        body: JSON.stringify(payload),
      });

      if (resp.status === 402) {
        const data: any = await resp.json();
        if (data.velocityCapped) {
          console.log(chalk.red(`\n✗ Velocity cap exceeded: ${data.currentSpend / 1000000} / $50 USDC`));
          return;
        }
        const cost = data.x402?.conditions?.amount;
        console.log(chalk.yellow(`\n← 402 Payment Required: ${cost ? fromMicroUsdc(cost) : '?'} USDC`));
        console.log(chalk.gray('  Session: ' + data.sessionId));
        console.log(chalk.yellow('\n  Payment signing requires a wallet. Use the frontend or SDK for full x402 flow.'));
      } else if (resp.status === 429) {
        console.log(chalk.red('\n✗ Rate limited. Wait 60 seconds.'));
      } else if (resp.ok) {
        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await resp.json();
          console.log(chalk.green('\n← Response (200 OK):'));
          console.log(JSON.stringify(data, null, 2));
        } else {
          const text = await resp.text();
          console.log(chalk.green('\n← Response (200 OK):'));
          console.log(text);
        }
      } else {
        const err = await resp.text();
        console.log(chalk.red(`\n✗ Error ${resp.status}: ${err}`));
      }
    } catch (e: any) {
      console.log(chalk.red(`\n✗ Connection failed: ${e.message}`));
      console.log(chalk.gray(`  Is the backend running at ${backendUrl}?`));
    }
  });

// ─── STATUS ─────────────────────────────────────────────────────────────────────
program
  .command('status')
  .description('Check rate limits and velocity cap status')
  .action(() => {
    const config = configManager.loadConfig();
    const count = config.endpoints.length;

    console.log(chalk.cyan('\n╔══════════════════════════════════════════╗'));
    console.log(chalk.cyan('║         EENDHAN STATUS                   ║'));
    console.log(chalk.cyan('╠══════════════════════════════════════════╣'));
    console.log(chalk.gray(`║  Backend URL:    ${config.backendUrl.padEnd(23)} ║`));
    console.log(chalk.gray(`║  Endpoints:      ${String(count).padEnd(23)} ║`));
    console.log(chalk.cyan('╠══════════════════════════════════════════╣'));
    console.log(chalk.gray('║  Request Rate:   100 req / min           ║'));
    console.log(chalk.gray('║  Burst Cap:      5 exec / 10s            ║'));
    console.log(chalk.gray('║  Velocity Cap:   $50 / 10 min            ║'));
    console.log(chalk.gray('║  Nonce Window:   60 seconds              ║'));
    console.log(chalk.cyan('╚══════════════════════════════════════════╝'));
  });

// ─── CONFIG ─────────────────────────────────────────────────────────────────────
const configCmd = program
  .command('config')
  .description('Manage CLI configuration');

configCmd
  .command('set <key> <value>')
  .description('Set a config value (e.g., backendUrl)')
  .action((key: string, value: string) => {
    const config = configManager.loadConfig();
    if (key === 'backendUrl') {
      config.backendUrl = value;
    } else if (key === 'defaultTier') {
      config.defaultTier = value;
    } else {
      console.log(chalk.red(`Unknown config key: ${key}`));
      console.log(chalk.gray('Available keys: backendUrl, defaultTier'));
      return;
    }
    configManager.saveConfig(config);
    console.log(chalk.green(`✓ ${key} = ${value}`));
  });

configCmd
  .command('view')
  .description('View current configuration')
  .action(() => {
    const config = configManager.loadConfig();
    console.log(chalk.cyan('\nCurrent Configuration:'));
    console.log(chalk.gray(JSON.stringify(config, null, 2)));
  });

program.parse();