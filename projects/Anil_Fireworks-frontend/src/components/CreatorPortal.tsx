import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@txnlab/use-wallet-react'
import { Wallet, LogOut, CheckCircle, Loader2, Link as LinkIcon, DollarSign, Text, FileText, Server, Plus, Trash2, Zap } from 'lucide-react'

const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '')

const DEFAULT_TIERS = [
  { name: 'basic', price: 10000 },
]

const CreatorPortal: React.FC = () => {
  const { activeAddress, wallets, isReady } = useWallet()
  const [connectingWallet, setConnectingWallet] = useState(false)

  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceUsdc, setPriceUsdc] = useState('1.00')
  const [pricingTiers, setPricingTiers] = useState(DEFAULT_TIERS)
  const [targetUrl, setTargetUrl] = useState('')
  const [method, setMethod] = useState('POST')
  const [enableTiers, setEnableTiers] = useState(false)

  const [status, setStatus] = useState<'idle' | 'registering' | 'success' | 'error'>('idle')
  const [endpointId, setEndpointId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const handleConnect = async (walletId: string) => {
    const wallet = wallets?.find(w => w.id === walletId)
    if (!wallet) return
    setConnectingWallet(true)
    try {
      await wallet.connect()
    } catch (e: any) {
      console.error(e)
    } finally {
      setConnectingWallet(false)
    }
  }

  const handleDisconnect = async () => {
    const connected = wallets?.find(w => w.isConnected)
    if (connected) await connected.disconnect()
  }

  const handleRegister = async () => {
    if (!activeAddress) {
      setErrorMessage('Please connect your Algorand wallet first to securely set your payout address.')
      setStatus('error')
      return
    }

    if (!title || !priceUsdc || !targetUrl) {
      setErrorMessage('Title, Price, and Target URL are required.')
      setStatus('error')
      return
    }

    setStatus('registering')
    setErrorMessage('')

    try {
      // Build pricing tiers object
      const tiersObj: Record<string, number> = {}
      if (enableTiers) {
        pricingTiers.forEach(tier => {
          tiersObj[tier.name] = tier.price
        })
      } else {
        tiersObj['basic'] = Math.round(parseFloat(priceUsdc) * 1000000)
      }

      const endpointId = crypto.randomUUID()
      
      const baseUrl = BACKEND_URL.replace(/\/$/, '')
      const resp = await fetch(`${baseUrl}/api/endpoints/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpointId,
          title,
          description,
          priceUsdc: parseFloat(priceUsdc),
          pricingTiers: tiersObj,
          targetUrl,
          method,
          creatorWallet: activeAddress,
        })
      })

      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.detail || 'Registration failed')
      }

      const data = await resp.json()
      setEndpointId(data.endpointId || endpointId)
      setStatus('success')
    } catch (e: any) {
      setErrorMessage(e.message)
      setStatus('error')
    }
  }

  const addTier = () => {
    const newTier = { name: `tier${pricingTiers.length + 1}`, price: 10000 }
    setPricingTiers([...pricingTiers, newTier])
  }

  const removeTier = (index: number) => {
    setPricingTiers(pricingTiers.filter((_, i) => i !== index))
  }

  const updateTier = (index: number, field: 'name' | 'price', value: string | number) => {
    const updated = [...pricingTiers]
    updated[index] = { ...updated[index], [field]: field === 'price' ? Math.round(parseFloat(String(value || '0')) * 1000000) : value }
    setPricingTiers(updated)
  }

  const copyToClipboard = () => {
    if (endpointId) {
      navigator.clipboard.writeText(endpointId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    background: '#111',
    color: '#F5F5F5',
    border: '1px solid #2a2a2a',
    borderRadius: '10px',
    padding: '12px 16px 12px 42px',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    outline: 'none',
    transition: 'border 0.2s',
  }

  const labelStyle = {
    color: '#A78BFA',
    fontFamily: "'Inter', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    marginBottom: '8px',
    display: 'block'
  }

  const iconStyle = {
    position: 'absolute' as const,
    left: '14px',
    top: '38px', // Adjust depending on label height
    color: '#666',
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      background: '#0a0a0a',
      border: '1px solid #2a2a2a',
      borderRadius: '24px',
      padding: '40px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        right: '-100px',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px', position: 'relative', zIndex: 1 }}>
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '32px',
          fontWeight: 700,
          color: '#F5F5F5',
          marginBottom: '12px'
        }}>
          Register Your API
        </h2>
        <p style={{ color: '#A0A0A0', fontFamily: "'Inter', sans-serif", fontSize: '15px' }}>
          Monetize your AI model, agent, or service effortlessly. Connect your wallet to define where payments are sent.
        </p>
      </div>

      {status === 'success' && endpointId ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
          background: '#111', border: '1px solid #4ade80', borderRadius: '16px',
          padding: '32px', textAlign: 'center', position: 'relative', zIndex: 1
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(74,222,128,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <CheckCircle size={32} color="#4ade80" />
          </div>
          <h3 style={{ color: '#F5F5F5', fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', marginBottom: '8px' }}>
            Registration Complete!
          </h3>
          <p style={{ color: '#A0A0A0', fontFamily: "'Inter', sans-serif", fontSize: '14px', marginBottom: '24px' }}>
            Your API is now protected by AlgoGate. Users must pay to access it.
          </p>

          <div style={{ background: '#000', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <p style={{ color: '#A78BFA', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Your Endpoint ID
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#111', padding: '12px 16px', borderRadius: '8px', border: '1px solid #333'
            }}>
              <code style={{ color: '#F5F5F5', fontSize: '15px', fontFamily: 'monospace' }}>{endpointId}</code>
              <button 
                onClick={copyToClipboard}
                style={{
                  background: copied ? '#4ade80' : '#2a2a2a',
                  color: copied ? '#000' : '#F5F5F5',
                  border: 'none', borderRadius: '6px', padding: '6px 12px',
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '12px', fontWeight: 600,
                  transition: 'all 0.2s'
                }}
              >
                {copied ? 'Copied!' : 'Copy ID'}
              </button>
            </div>
          </div>

          <button 
            onClick={() => { setStatus('idle'); setEndpointId(null) }}
            style={{
              background: 'transparent', color: '#A0A0A0', border: 'none',
              fontFamily: "'Inter', sans-serif", fontSize: '14px', cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Register another endpoint
          </button>
        </motion.div>
      ) : (
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Wallet Connection */}
          <div style={{
            background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px',
            padding: '20px', marginBottom: '32px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'
          }}>
            <div>
              <label style={labelStyle}>Payout Wallet Address</label>
              <p style={{ color: '#666', fontSize: '13px', fontFamily: "'Inter', sans-serif", margin: 0 }}>
                {activeAddress ? 'Payments will be routed directly to this address.' : 'Connect your wallet to receive USDC payments.'}
              </p>
            </div>
            
            {activeAddress ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: '#000', padding: '8px 16px', borderRadius: '8px', border: '1px solid #333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
                  <span style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: '13px' }}>
                    {activeAddress.slice(0, 8)}...{activeAddress.slice(-6)}
                  </span>
                </div>
                <button
                  onClick={handleDisconnect}
                  style={{
                    background: 'transparent', border: '1px solid #3a3a3a', color: '#A0A0A0',
                    borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <LogOut size={14} /> Disconnect
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                {isReady && wallets?.map(wallet => (
                  <button
                    key={wallet.id}
                    onClick={() => handleConnect(wallet.id)}
                    disabled={connectingWallet}
                    style={{
                      background: '#A78BFA', border: 'none', color: '#fff',
                      borderRadius: '8px', padding: '10px 20px', cursor: 'pointer',
                      fontSize: '13px', fontWeight: 600, fontFamily: "'Inter', sans-serif",
                      display: 'flex', alignItems: 'center', gap: '8px',
                      opacity: connectingWallet ? 0.6 : 1,
                    }}
                  >
                    <Wallet size={16} />
                    {connectingWallet ? 'Connecting...' : `Connect ${wallet.metadata.name}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>API Name / Title</label>
              <Text size={18} style={iconStyle} />
              <input
                type="text"
                placeholder="e.g. GPT-4 Code Reviewer"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={inputStyle}
              />
            </div>
            
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Price per call (USDC)</label>
              <DollarSign size={18} style={iconStyle} />
              <input
                type="number"
                placeholder="0.1"
                step="0.01"
                value={priceUsdc}
                onChange={e => setPriceUsdc(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Enable Multi-Tier Pricing */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={enableTiers} 
                onChange={e => setEnableTiers(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#A78BFA' }}
              />
              <Zap size={14} />
              Enable Custom Pricing Tiers
            </label>
            <p style={{ color: '#666', fontSize: '12px', marginTop: '4px', marginBottom: '12px' }}>
              Create custom tiers like "fast", "deep-research", "code-generation" with your own prices
            </p>
            {enableTiers && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pricingTiers.map((tier, index) => (
                  <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={tier.name}
                      onChange={e => updateTier(index, 'name', e.target.value)}
                      placeholder="e.g., fast, premium, unlimited"
                      style={{ ...inputStyle, width: '180px', padding: '10px 12px' }}
                    />
                    <span style={{ color: '#666' }}>{'→'}</span>
                    <input
                      type="number"
                      value={(tier.price / 1000000).toFixed(4)}
                      onChange={e => updateTier(index, 'price', e.target.value)}
                      placeholder="0.0001"
                      step="0.0001"
                      style={{ ...inputStyle, width: '100px', padding: '10px 12px' }}
                    />
                    <span style={{ color: '#A0A0A0', fontSize: '13px' }}>USDC</span>
                    {pricingTiers.length > 1 && (
                      <button 
                        onClick={() => removeTier(index)}
                        style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '8px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => {
                    const newName = pricingTiers.length === 1 ? 'premium' : `tier${pricingTiers.length + 1}`;
                    setPricingTiers([...pricingTiers, { name: newName, price: 10000 }]);
                  }}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', 
                    background: 'transparent', border: '1px dashed #333', 
                    color: '#A78BFA', padding: '10px 16px', borderRadius: '8px',
                    cursor: 'pointer', fontSize: '13px', width: 'fit-content'
                  }}
                >
                  <Plus size={14} /> Add Custom Tier
                </button>
              </div>
            )}
          </div>

          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <label style={labelStyle}>Brief Description</label>
            <FileText size={18} style={{ ...iconStyle, top: '40px' }} />
            <textarea
              placeholder="What does this endpoint do?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ ...inputStyle, minHeight: '80px', paddingLeft: '42px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', marginBottom: '40px' }}>
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Method</label>
              <Server size={18} style={{ ...iconStyle, left: '16px' }} />
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '42px', appearance: 'none', cursor: 'pointer' }}
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
              </select>
            </div>

            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Your Target URL</label>
              <LinkIcon size={18} style={{ ...iconStyle, left: '16px' }} />
              <input
                type="url"
                placeholder="https://your-api.com/v1/generate"
                value={targetUrl}
                onChange={e => setTargetUrl(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '42px' }}
              />
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ color: '#f87171', fontSize: '14px', marginBottom: '20px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}
              >
                {errorMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleRegister}
            disabled={status === 'registering' || !activeAddress}
            style={{
              width: '100%',
              padding: '16px',
              background: !activeAddress ? '#2a2a2a' : '#A78BFA',
              color: !activeAddress ? '#666' : '#fff',
              border: 'none',
              borderRadius: '12px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: '18px',
              cursor: status === 'registering' || !activeAddress ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'background 0.2s',
            }}
          >
            {status === 'registering' ? (
              <><Loader2 size={20} className="animate-spin" /> Registering Endpoint...</>
            ) : !activeAddress ? (
              'Connect Wallet to Register'
            ) : (
              'Register & Generate Dynamic Proxy'
            )}
          </button>
        </div>
      )}
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default CreatorPortal
