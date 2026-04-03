import React, { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import algosdk from 'algosdk'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, CheckCircle, Loader2, AlertCircle, Wallet, LogOut, TerminalSquare } from 'lucide-react'

// Algorand Testnet config
const algodToken = ''
const algodServer = 'https://testnet-api.algonode.cloud'
const algodPort = ''
const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort)

const BACKEND_URL = 'http://localhost:8000'
const USDC_ASSET_ID = 10458941 // Circle USDC on Algorand Testnet

const GatewayTester: React.FC = () => {
  const [endpointId, setEndpointId] = useState('123e4567-e89b-12d3-a456-426614174000')
  const [jsonPayload, setJsonPayload] = useState('{\n  "query": "Hello, AI!"\n}')
  
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'payment_required' | 'paying' | 'success' | 'error'>('idle')
  const [log, setLog] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)
  const [connectingWallet, setConnectingWallet] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)
  const [challenge, setChallenge] = useState<any>(null)

  const { activeAddress, wallets, signTransactions, isReady } = useWallet()

  // Timer Effect
  React.useEffect(() => {
    let timer: NodeJS.Timeout
    if (status === 'payment_required' || status === 'paying') {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setStatus('error')
            addLog('Session Expired. Please try again.')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [status])

  const addLog = (msg: string) => setLog(prev => [...prev, msg])

  const handleConnect = async (walletId: string) => {
    const wallet = wallets?.find(w => w.id === walletId)
    if (!wallet) return
    setConnectingWallet(true)
    try {
      await wallet.connect()
    } catch (e: any) {
      addLog(`Wallet connection failed: ${e.message}`)
    } finally {
      setConnectingWallet(false)
    }
  }

  const handleDisconnect = async () => {
    const connected = wallets?.find(w => w.isConnected)
    if (connected) await connected.disconnect()
  }

  const handleSubmit = async () => {
    if (!endpointId.trim()) {
      addLog('Error: Endpoint ID cannot be empty.')
      return
    }
    try {
      JSON.parse(jsonPayload)
    } catch (e) {
      addLog('Error: Invalid JSON Payload format.')
      return
    }
    if (!activeAddress) {
      addLog('Error: Connect your Algorand wallet first.')
      return
    }

    setLog([])
    setResult(null)
    setStatus('analyzing')
    addLog(`Initiating request to /api/execute/${endpointId}...`)

    try {
      let reqBody
      try { reqBody = JSON.parse(jsonPayload) } catch(e) { reqBody = jsonPayload }

      const resp = await fetch(`${BACKEND_URL}/api/execute/${endpointId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      })

      if (resp.status === 402) {
        const data = await resp.json()
        setChallenge(data)
        setTimeLeft(60) // Reset timer to 60s
        setStatus('payment_required')
        
        const usdcCost = data.x402?.conditions?.amount / 1000000 || "0"
        addLog(`Received 402 Payment Required. Cost: ${usdcCost} USDC`)
        
        await handlePaymentFlow(data, reqBody)
      } else if (resp.ok) {
        const data = await resp.json()
        setStatus('success')
        setResult(data)
      } else {
        throw new Error(`Unexpected status: ${resp.status}`)
      }
    } catch (e: any) {
      console.error(e)
      setStatus('error')
      addLog(`Error: ${e.message}`)
    }
  }

  const handlePaymentFlow = async (challengeData: any, reqBody: any) => {
    setStatus('paying')
    addLog('Building USDC asset transfer transaction (axfer)...')

    try {
      const conditions = challengeData.x402?.conditions ?? {}
      const sessionId = challengeData.sessionId ?? 'no-session'

      // Native ALGO payment transaction (not ASA)
      const suggestedParams = await algodClient.getTransactionParams().do()
      
      // Enforce On-Chain Expiration (Termination)
      if (challengeData.lastRound) {
        (suggestedParams as any).lastRound = challengeData.lastRound
      }

      const ptxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress!,
        receiver: conditions.receiver ?? 'TPXCOJSONCOKFZDP76S2XR5HU4SISWOXUXFWRSOT2HL3V7TYRCZD7BXWYY',
        assetIndex: USDC_ASSET_ID,
        amount: conditions.amount ?? 1000000, // micro-USDC (1 USDC default)
        suggestedParams,
      })

      addLog(`Requesting wallet signature from ${activeAddress}...`)
      const signedTxns = await signTransactions([ptxn])
      const signedTxn = signedTxns[0]
      if (!signedTxn) throw new Error('Transaction signing was rejected.')

      addLog('Signed! Broadcasting to Algorand TestNet...')
      const { txid } = (await algodClient.sendRawTransaction(signedTxn).do()) as { txid: string }
      addLog(`Tx broadcast: ${txid}`)

      // Encode signed txn as base64 for X-Payment header
      const signedTxnBase64 = Buffer.from(signedTxn).toString('base64')

      addLog('Submitting payment proof to proxy gateway...')
      const verifyResp = await fetch(`${BACKEND_URL}/api/execute/${endpointId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Payment': `tx64=${signedTxnBase64}, session=${sessionId}`
        },
        body: JSON.stringify(reqBody)
      })

      if (verifyResp.ok) {
        const resultData = await verifyResp.json()
        addLog('Payment verified! Proxy response received.')
        setStatus('success')
        setResult(resultData)
      } else {
        const err = await verifyResp.json()
        throw new Error(`Verification failed: ${err.detail || verifyResp.statusText}`)
      }

    } catch (e: any) {
      console.error(e)
      setStatus('error')
      addLog(`Payment failed: ${e.message}`)
    }
  }

  const isBusy = status === 'analyzing' || status === 'paying'

  // Dynamic cost display
  const targetCostUsdc = challenge ? ((challenge.x402?.conditions?.amount || 0) / 1000000).toFixed(2) : "Dynamic"

  return (
    <div className="resume-reviewer-container" style={{
      maxWidth: '1200px',
      margin: '0 auto',
      background: '#0a0a0a',
      border: '1px solid #2a2a2a',
      borderRadius: '20px',
      padding: '40px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '28px', fontWeight: 700, color: '#F5F5F5', marginBottom: '10px'
        }}>
          AlgoGate Proxy Sandbox
        </h2>
        <p style={{ color: '#A0A0A0', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
          Test any registered endpoint · Cost: <strong style={{ color: '#A78BFA' }}>{targetCostUsdc} USDC</strong> · Paid on Algorand TestNet
        </p>
      </div>

      {/* Wallet Section */}
      <div style={{
        background: '#111',
        border: '1px solid #2a2a2a',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {activeAddress ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#4ade80', boxShadow: '0 0 6px #4ade80',
              }} />
              <span style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: '13px' }}>
                {activeAddress.slice(0, 8)}...{activeAddress.slice(-6)}
              </span>
              <span style={{ color: '#666', fontSize: '12px', fontFamily: "'Inter', sans-serif" }}>
                (TestNet)
              </span>
            </div>
            <button
              onClick={handleDisconnect}
              style={{
                background: 'transparent', border: '1px solid #3a3a3a',
                color: '#A0A0A0', borderRadius: '8px', padding: '6px 14px',
                cursor: 'pointer', fontSize: '13px', fontFamily: "'Inter', sans-serif",
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <LogOut size={14} /> Disconnect
            </button>
          </>
        ) : (
          <>
            <span style={{ color: '#666', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}>
              Connect wallet to pay with USDC
            </span>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {isReady && wallets?.map(wallet => (
                <button
                  key={wallet.id}
                  onClick={() => handleConnect(wallet.id)}
                  disabled={connectingWallet}
                  style={{
                    background: '#A78BFA',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: connectingWallet ? 0.6 : 1,
                  }}
                >
                  <Wallet size={14} />
                  {connectingWallet ? 'Connecting...' : `Connect ${wallet.metadata.name}`}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Main Grid */}
      <div className="resume-grid" style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '32px' }}>
        {/* Left: Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div>
            <label style={{
              color: '#A78BFA', fontFamily: "'Inter', sans-serif",
              fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              Endpoint ID
            </label>
            <input
              type="text"
              value={endpointId}
              onChange={e => setEndpointId(e.target.value)}
              disabled={isBusy}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#111', color: '#F5F5F5', border: '1px solid #2a2a2a',
                borderRadius: '8px', padding: '10px 14px', fontFamily: 'monospace',
                fontSize: '13px', outline: 'none', marginTop: '6px',
                opacity: isBusy ? 0.6 : 1,
              }}
            />
          </div>

          <div>
            <label style={{
              color: '#A78BFA', fontFamily: "'Inter', sans-serif",
              fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              JSON Request Payload
            </label>
            <textarea
              value={jsonPayload}
              onChange={e => setJsonPayload(e.target.value)}
              disabled={isBusy}
              style={{
                width: '100%', height: '140px', boxSizing: 'border-box',
                background: '#111', color: '#F5F5F5', border: '1px solid #2a2a2a',
                borderRadius: '12px', padding: '16px', fontFamily: 'monospace',
                fontSize: '13px', resize: 'vertical', outline: 'none', marginTop: '6px',
                opacity: isBusy ? 0.6 : 1,
              }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isBusy || !activeAddress}
            style={{
              width: '100%', padding: '14px',
              background: !activeAddress ? '#2a2a2a' : '#A78BFA',
              color: !activeAddress ? '#666' : '#fff',
              border: 'none', borderRadius: '12px',
              fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '15px',
              cursor: isBusy || !activeAddress ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 0.2s',
            }}
          >
            {status === 'analyzing' ? (
              <><Loader2 size={18} className="animate-spin" /> Fetching config...</>
            ) : status === 'paying' ? (
              <><Loader2 size={18} className="animate-spin" /> Processing Payment...</>
            ) : !activeAddress ? (
              <><Wallet size={18} /> Connect Wallet First</>
            ) : (
              <><TerminalSquare size={18} /> Call Endpoint Proxy</>
            )}
          </button>

          {/* Terminal log */}
          <div style={{
            background: '#000', border: '1px solid #1a1a1a', borderRadius: '12px',
            padding: '14px', height: '160px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px',
          }}>
            <div style={{ color: '#444', marginBottom: '8px', letterSpacing: '0.1em', fontSize: '10px' }}>
              TERMINAL LOGS
            </div>
            {log.length === 0
              ? <div style={{ color: '#333' }}>Awaiting interaction...</div>
              : log.map((l, i) => (
                <div key={i} style={{ color: '#4ade80', marginBottom: '4px' }}>
                  <span style={{ color: '#555' }}>&gt; </span>{l}
                </div>
              ))}
          </div>
        </div>

        {/* Right: Output */}
        <div style={{
          background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px',
          padding: '24px', minHeight: '400px', display: 'flex', flexDirection: 'column',
        }}>
          <h3 style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px',
            fontWeight: 700, color: '#F5F5F5', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#A78BFA', display: 'inline-block' }} />
            Proxied Output
          </h3>

          {status === 'idle' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#444', textAlign: 'center' }}>
              <TerminalSquare size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>Configure endpoint and payload to test reverse proxy.</p>
            </div>
          )}

          {status === 'analyzing' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#A78BFA', textAlign: 'center', gap: '12px' }}>
              <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
                Contacting AlgoGate...
              </p>
            </div>
          )}

          {(status === 'payment_required' || status === 'paying') && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e8856a', textAlign: 'center', gap: '20px' }}>
              {/* Circular Progress Bar */}
              <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle
                    cx="40" cy="40" r="36"
                    fill="none" stroke="#2a2a2a" strokeWidth="4"
                  />
                  <motion.circle
                    cx="40" cy="40" r="36"
                    fill="none" stroke="#e8856a" strokeWidth="4"
                    strokeDasharray="226.19"
                    animate={{ strokeDashoffset: 226.19 - (226.19 * timeLeft) / 60 }}
                    transition={{ duration: 1, ease: "linear" }}
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  fontSize: '18px', fontWeight: 700, fontFamily: 'monospace'
                }}>
                  {timeLeft}s
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>402 Payment Required</p>
                <p style={{ fontSize: '13px', color: '#A0A0A0' }}>Session expires in {timeLeft} seconds</p>
              </div>
              {status === 'paying' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#A78BFA' }}>
                   <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                   <p style={{ fontSize: '12px' }}>Signing & broadcasting transaction...</p>
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: '#666', maxWidth: '200px' }}>Approve the {targetCostUsdc} USDC transfer to continue...</p>
              )}
            </div>
          )}

          {status === 'success' && result && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ flex: 1, overflowY: 'auto' }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  color: '#4ade80', fontWeight: 700, marginBottom: '16px',
                  background: 'rgba(74,222,128,0.08)', padding: '10px 14px',
                  borderRadius: '8px', border: '1px solid rgba(74,222,128,0.2)',
                  fontFamily: "'Inter', sans-serif", fontSize: '13px',
                }}>
                  <CheckCircle size={16} /> x402 Verified — Raw Creator JSON Response Below
                </div>

                <div style={{ background: '#000', padding: '16px', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
                    <pre style={{ color: '#F5F5F5', fontSize: '13px', whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'monospace' }}>
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {status === 'error' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#f87171', textAlign: 'center', gap: '10px' }}>
              <AlertCircle size={40} style={{ opacity: 0.6 }} />
              <p style={{ fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>An error occurred.</p>
              <p style={{ fontSize: '13px', opacity: 0.7 }}>Check terminal logs for details.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .resume-grid { grid-templateColumns: 1fr !important; gap: 24px !important; }
          .resume-reviewer-container { padding: 20px !important; }
        }
      `}</style>
    </div>
  )
}

export default GatewayTester
