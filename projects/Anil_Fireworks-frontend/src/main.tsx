import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/main.css'
import ErrorBoundary from './components/ErrorBoundary'
import { WalletProvider } from '@txnlab/use-wallet-react'
import { WalletManager, WalletId, NetworkId } from '@txnlab/use-wallet'

const walletManager = new WalletManager({
  wallets: [
    WalletId.PERA,
    WalletId.DEFLY,
  ],
  networks: {
    [NetworkId.TESTNET]: {
      algod: {
        token: '',
        baseServer: 'https://testnet-api.algonode.cloud',
        port: '',
      },
    },
  },
  defaultNetwork: NetworkId.TESTNET,
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <WalletProvider manager={walletManager}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </WalletProvider>
  </React.StrictMode>,
)
