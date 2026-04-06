# 🚀 Team EENDHAN

### Core Team Members:
*   **Tanishq Mandolkar**
*   **Yuvraj Kakade**
*   **Devavrat Dhaygude**
*   **Anish Maniyar**

---

# EENDHAN

This starter full stack project has been generated using AlgoKit. See below for default getting started instructions.

## Setup

### Initial setup
1. Clone this repository to your local machine.
2. Ensure [Docker](https://www.docker.com/) is installed and operational. Then, install `AlgoKit` following this [guide](https://github.com/algorandfoundation/algokit-cli#install).
3. Run `algokit project bootstrap all` in the project directory. This command sets up your environment by installing necessary dependencies, setting up a Python virtual environment, and preparing your `.env` file.
4. In the case of a smart contract project, execute `algokit generate env-file -a target_network localnet` from the `Anil_Fireworks-contracts` directory to create a `.env.localnet` file with default configuration for `localnet`.
5. To build your project, execute `algokit project run build`. This compiles your project and prepares it for running.
6. For project-specific instructions, refer to the READMEs of the child projects:
   - Smart Contracts: [Anil_Fireworks-contracts](projects/Anil_Fireworks-contracts/README.md)
   - Frontend Application: [Anil_Fireworks-frontend](projects/Anil_Fireworks-frontend/README.md)

> This project is structured as a monorepo, refer to the [documentation](https://github.com/algorandfoundation/algokit-cli/blob/main/docs/features/project/run.md) to learn more about custom command orchestration via `algokit project run`.

### Subsequently

1. If you update to the latest source code and there are new dependencies, you will need to run `algokit project bootstrap all` again.
2. Follow step 3 above.

### Continuous Integration / Continuous Deployment (CI/CD)

This project uses [GitHub Actions](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions) to define CI/CD workflows, which are located in the [`.github/workflows`](./.github/workflows) folder. You can configure these actions to suit your project's needs, including CI checks, audits, linting, type checking, testing, and deployments to TestNet.

For pushes to `main` branch, after the above checks pass, the following deployment actions are performed:
  - The smart contract(s) are deployed to TestNet using [AlgoNode](https://algonode.io).
  - The frontend application is deployed to a provider of your choice (Netlify, Vercel, etc.). See [frontend README](frontend/README.md) for more information.

> Please note deployment of smart contracts is done via `algokit deploy` command which can be invoked both via CI as seen on this project, or locally. For more information on how to use `algokit deploy` please see [AlgoKit documentation](https://github.com/algorandfoundation/algokit-cli/blob/main/docs/features/deploy.md).

## Tools

This project makes use of Python and React to build Algorand smart contracts and to provide a base project configuration to develop frontends for your Algorand dApps and interactions with smart contracts. The following tools are in use:

- Algorand, AlgoKit, and AlgoKit Utils
- Python dependencies including Poetry, Black, Ruff or Flake8, mypy, pytest, and pip-audit
- React and related dependencies including AlgoKit Utils, Tailwind CSS, daisyUI, use-wallet, npm, jest, playwright, Prettier, ESLint, and Github Actions workflows for build validation

### VS Code

It has also been configured to have a productive dev experience out of the box in [VS Code](https://code.visualstudio.com/), see the [backend .vscode](./backend/.vscode) and [frontend .vscode](./frontend/.vscode) folders for more details.

## Integrating with smart contracts and application clients

Refer to the [Anil_Fireworks-contracts](projects/Anil_Fireworks-contracts/README.md) folder for overview of working with smart contracts, [projects/Anil_Fireworks-frontend](projects/Anil_Fireworks-frontend/README.md) for overview of the React project and the [projects/Anil_Fireworks-frontend/contracts](projects/Anil_Fireworks-frontend/src/contracts/README.md) folder for README on adding new smart contracts from backend as application clients on your frontend. The templates provided in these folders will help you get started.
When you compile and generate smart contract artifacts, your frontend component will automatically generate typescript application clients from smart contract artifacts and move them to `frontend/src/contracts` folder, see [`generate:app-clients` in package.json](projects/Anil_Fireworks-frontend/package.json). Afterwards, you are free to import and use them in your frontend application.

The frontend starter also provides an example of interactions with your EendhanClient in [`AppCalls.tsx`](projects/Anil_Fireworks-frontend/src/components/AppCalls.tsx) component by default.

## 🚀 Running the Project

Follow these steps to run the EENDHAN decentralized AI agency components locally or on TestNet.

### 1. Initial Setup
Before running any component, ensure you have bootstrapped the entire project:
```bash
algokit project bootstrap all
```

### 2. Blockchain / Smart Contracts
You can run the smart contracts either on a local network (LocalNet) or on the Algorand TestNet.

#### **LocalNet (Development)**
1.  **Start LocalNet**: Ensure Docker is running and start the local network:
    ```bash
    algokit localnet start
    ```
2.  **Deploy Contracts**: Deploy the EENDHAN smart contracts to LocalNet:
    ```bash
    cd projects/Anil_Fireworks-contracts && algokit project deploy localnet
    ```

#### **TestNet (Staging)**
1.  **Deploy to TestNet**: Use the following command to deploy directly to TestNet:
    ```bash
    cd projects/Anil_Fireworks-contracts && algokit project deploy testnet
    ```
    *(Note: Ensure your DEPLOYER account is funded on TestNet.)*

---

### 3. Backend API
The backend handles the x402 payment validation and AI agent logic. It requires a `.env` file with Supabase and AI provider keys.

1.  **Environment Sync**: Ensure `projects/backend/.env` is configured (see `.env.example`).
2.  **Run Service**: From the root directory:
    ```bash
    cd projects/backend && poetry run uvicorn main:app --reload
    ```
    The API will be available at `http://localhost:8000`. You can view the docs at `/docs`.

---

### 4. Frontend Application
The frontend is a React application that interacts with the smart contracts and backend.

1.  **Link Contracts**: (Automatically handled by `npm run dev`)
2.  **Run Dev Server**:
    ```bash
    cd projects/Anil_Fireworks-frontend && npm run dev
    ```
    The application will be available at `http://localhost:5173`.

> [!TIP]
> To switch between **LocalNet** and **TestNet** on the frontend, update the environment variables in `projects/Anil_Fireworks-frontend/.env` as described in `.env.template`.

---

## Next Steps

## Project EENDHAN: Decentralized AI Agency

EENDHAN is a decentralized AI agency infrastructure built on Algorand, enabling seamless, pay-per-use AI services through the **x402 Payment Protocol**.

### 🛠 Core Components

*   **[EENDHAN SDK](packages/sdk/README.md)**: A TypeScript/JavaScript SDK for integrating DeAI payments into any web or node.js application.
*   **[EENDHAN CLI](packages/cli/README.md)**: A powerful command-line tool for managing endpoints, creating mandates, and making manual AI calls.
*   **Universal AI Proxy**: A smart reverse-proxy that handles x402 verification and supports both JSON-based text APIs and binary image generation tools (e.g., Pollinations AI).
*   **AI Agentic Wallet**: Support for spending mandates that allow AI agents to make autonomous payments within user-defined limits.

### 💳 x402 Payment Protocol

x402 is a specialized HTTP-based payment protocol that utilizes Algorand (USDC) for real-time API monetization. It features:
*   **Dynamic Tiering**: Creators can set multiple pricing levels (e.g., basic, premium).
*   **Velocity Capping**: Automatic 10-minute spending limits ($50/10min) to prevent wallet drain.
*   **Binary Support**: The gateway handles raw image blobs, JPEGs, and text responses transparently.

### 🚀 Getting Started with EENDHAN

1.  **Initialize CLI**:
    ```bash
    npx @eendhan/cli init
    ```
2.  **Make a Test Call**:
    ```bash
    npx @eendhan/cli call <endpoint-id> --payload '{"prompt": "Hello DeAI"}'
    ```
3.  **Integrate SDK**:
    ```bash
    npm install @eendhan/sdk
    ```

For full documentation on specific features, refer to the [SDK README](packages/sdk/README.md) and [CLI README](packages/cli/README.md).
