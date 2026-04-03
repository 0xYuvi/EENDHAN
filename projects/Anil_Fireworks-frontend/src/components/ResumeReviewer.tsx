import React, { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import algosdk from 'algosdk'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, CheckCircle, Loader2, AlertCircle, Wallet, LogOut } from 'lucide-react'

// Algorand Testnet config
const algodToken = ''
const algodServer = 'https://testnet-api.algonode.cloud'
const algodPort = ''
const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort)

const BACKEND_URL = 'http://localhost:8000'

const ResumeReviewer: React.FC = () => {
  const [resumeText, setResumeText] = useState('')
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'payment_required' | 'paying' | 'success' | 'error'>('idle')
  const [log, setLog] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)
  const [connectingWallet, setConnectingWallet] = useState(false)

  const { activeAddress, wallets, signTransactions, isReady } = useWallet()

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
    if (!resumeText.trim()) {
      addLog('Error: Resume text cannot be empty.')
      return
    }
    if (!activeAddress) {
      addLog('Error: Connect your Algorand wallet first.')
      return
    }

    setLog([])
    setResult(null)
    setStatus('analyzing')
    addLog('Initiating request to /api/ai/premium-endpoint...')

    try {
      const resp = await fetch(`${BACKEND_URL}/api/ai/premium-endpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: resumeText })
      })

      if (resp.status === 402) {
        setStatus('payment_required')
        const data = await resp.json()
        addLog(`Received 402 Payment Required.`)
        addLog(`Conditions: ${JSON.stringify(data.x402?.conditions ?? {})}`)
        await handlePaymentFlow(data)
      } else if (resp.ok) {
        const data = await resp.json()
        setStatus('success')
        setResult(data.ai_output)
      } else {
        throw new Error(`Unexpected status: ${resp.status}`)
      }
    } catch (e: any) {
      console.error(e)
      setStatus('error')
      addLog(`Error: ${e.message}`)
    }
  }

  const handlePaymentFlow = async (challengeData: any) => {
    setStatus('paying')
    addLog('Building ALGO payment transaction...')

    try {
      const conditions = challengeData.x402?.conditions ?? {}
      const sessionId = challengeData.sessionId ?? 'no-session'

      // Native ALGO payment transaction (not ASA)
      const suggestedParams = await algodClient.getTransactionParams().do()
      const ptxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAddress!,
        receiver: conditions.receiver ?? 'TPXCOJSONCOKFZDP76S2XR5HU4SISWOXUXFWRSOT2HL3V7TYRCZD7BXWYY',
        amount: conditions.amount ?? 10000, // 0.01 ALGO in microALGO
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

      addLog('Submitting payment proof to backend...')
      const verifyResp = await fetch(`${BACKEND_URL}/api/ai/premium-endpoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Payment': `tx64=${signedTxnBase64}, session=${sessionId}`
        },
        body: JSON.stringify({ resume_text: resumeText })
      })

      if (verifyResp.ok) {
        const resultData = await verifyResp.json()
        addLog('Payment verified! AI response received.')
        setStatus('success')
        setResult(resultData.ai_output)
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
          AI Resume Reviewer
        </h2>
        <p style={{ color: '#A0A0A0', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
          Powered by Llama 4 + x402 Protocol · Cost: <strong style={{ color: '#A78BFA' }}>0.01 ALGO</strong> · Paid on Algorand TestNet
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
              Connect wallet to pay with ALGO
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
          <label style={{
            color: '#A78BFA', fontFamily: "'Inter', sans-serif",
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Paste Resume Text
          </label>
          <textarea
            value={resumeText}
            onChange={e => setResumeText(e.target.value)}
            disabled={isBusy}
            placeholder="Experience: Software Engineer at XYZ Corp (2020–2023)&#10;Skills: Python, Kubernetes, React..."
            style={{
              width: '100%', height: '220px', boxSizing: 'border-box',
              background: '#111', color: '#F5F5F5', border: '1px solid #2a2a2a',
              borderRadius: '12px', padding: '16px', fontFamily: 'monospace',
              fontSize: '13px', resize: 'vertical', outline: 'none',
              opacity: isBusy ? 0.6 : 1,
            }}
          />

          <button
            onClick={handleSubmit}
            disabled={isBusy || !resumeText.trim() || !activeAddress}
            style={{
              width: '100%', padding: '14px',
              background: !activeAddress ? '#2a2a2a' : '#A78BFA',
              color: !activeAddress ? '#666' : '#fff',
              border: 'none', borderRadius: '12px',
              fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '15px',
              cursor: isBusy || !resumeText.trim() || !activeAddress ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 0.2s',
            }}
          >
            {status === 'analyzing' ? (
              <><Loader2 size={18} className="animate-spin" /> Requesting API...</>
            ) : status === 'paying' ? (
              <><Loader2 size={18} className="animate-spin" /> Processing Payment...</>
            ) : !activeAddress ? (
              <><Wallet size={18} /> Connect Wallet First</>
            ) : (
              <><Bot size={18} /> Generate Honest Critique (0.01 ALGO)</>
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
            AI Critique Output
          </h3>

          {status === 'idle' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#444', textAlign: 'center' }}>
              <Bot size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>Submit your resume to get brutally honest feedback.</p>
            </div>
          )}

          {(status === 'analyzing' || status === 'paying') && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#A78BFA', textAlign: 'center', gap: '12px' }}>
              <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
                {status === 'paying' ? 'Signing & broadcasting transaction...' : 'Waiting for backend...'}
              </p>
            </div>
          )}

          {status === 'payment_required' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e8856a', textAlign: 'center', gap: '10px' }}>
              <AlertCircle size={40} />
              <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>402 Payment Required</p>
              <p style={{ fontSize: '13px', color: '#A0A0A0' }}>Approve the wallet transaction to continue...</p>
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
                  <CheckCircle size={16} /> x402 Payment Verified — AI Response Below
                </div>

                {typeof result === 'object' ? (
                  <div style={{ fontFamily: "'Inter', sans-serif" }}>
                    {result.error && (
                      <div style={{ color: '#f87171', marginBottom: '16px', background: '#2a0a0a', padding: '12px', borderRadius: '8px', border: '1px solid #f87171' }}>
                        <strong>Backend Error:</strong> {result.error}
                      </div>
                    )}
                    {result.score !== undefined && (
                      <div style={{ marginBottom: '16px' }}>
                        <span style={{ color: '#A0A0A0', fontSize: '12px' }}>SCORE</span>
                        <div style={{ fontSize: '48px', fontWeight: 800, color: result.score >= 70 ? '#4ade80' : result.score >= 40 ? '#facc15' : '#f87171' }}>
                          {result.score}<span style={{ fontSize: '20px', color: '#666' }}>/100</span>
                        </div>
                      </div>
                    )}
                    {result.feedback_points?.map((p: string, i: number) => (
                      <div key={i} style={{
                        background: '#0a0a0a', border: '1px solid #2a2a2a',
                        borderRadius: '8px', padding: '12px 16px', marginBottom: '10px',
                        color: '#F5F5F5', fontSize: '14px', lineHeight: '1.6',
                        borderLeft: '3px solid #A78BFA',
                      }}>
                        {p}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#F5F5F5', fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap', fontFamily: "'Inter', sans-serif" }}>
                    {result}
                  </p>
                )}
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

export default ResumeReviewer
