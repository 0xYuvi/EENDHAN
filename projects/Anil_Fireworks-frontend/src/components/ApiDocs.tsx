import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ── Types ── */
interface Field {
  name: string
  type: string
  required?: boolean
  desc: string
}
interface EndpointDef {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  tag: string
  summary: string
  description: string
  protected: boolean
  request?: Field[]
  response: Field[]
  example?: { req?: object; res: object }
}

/* ── Data ── */
const ENDPOINTS: EndpointDef[] = [
  {
    method: 'GET',
    path: '/',
    tag: 'Health',
    summary: 'Health Check',
    description: 'Returns API running status.',
    protected: false,
    response: [
      { name: 'message', type: 'string', desc: 'Status message confirming the API is live.' },
    ],
    example: {
      res: { message: 'AlgoGate AI Backend API is running. See /docs for endpoints.' },
    },
  },
  {
    method: 'POST',
    path: '/api/ai/premium-endpoint',
    tag: 'AI',
    summary: 'AI Resume Analyzer',
    description:
      'The core x402 pay-per-use endpoint. First call returns 402 Payment Required with a challenge. Resend with the signed Algorand ALGO payment transaction in the X-Payment header to unlock the Groq-powered AI critique.',
    protected: true,
    request: [
      { name: 'resume_text', type: 'string', required: true, desc: 'Full resume text to be analyzed by the AI.' },
    ],
    response: [
      { name: 'status', type: 'string', desc: '"success" on verified payment.' },
      { name: 'ai_output', type: 'object', desc: 'Contains score (int 1–100) and feedback_points (string[3]).' },
      { name: 'payment_details', type: 'object', desc: 'Verified on-chain ALGO transaction metadata.' },
    ],
    example: {
      req: { resume_text: 'Software Engineer, 3 YoE, Python, React...' },
      res: {
        status: 'success',
        ai_output: {
          score: 62,
          feedback_points: [
            'No quantifiable achievements. "Led a team" means nothing without numbers.',
            'Skills section reads like a keyword dump. Hiring managers will ignore it.',
            'Resume is 3 pages. Trim it to one. No one reads past page 1.',
          ],
        },
      },
    },
  },
  {
    method: 'POST',
    path: '/api/x402/challenge',
    tag: 'x402',
    summary: 'Issue x402 Payment Challenge',
    description:
      'Manually issue a payment challenge for a registered endpoint. Returns the USDC amount, receiver address, and a session ID for tracking.',
    protected: false,
    request: [
      { name: 'endpointId', type: 'string (UUID)', required: true, desc: 'UUID of the target endpoint.' },
      { name: 'consumerWallet', type: 'string', required: true, desc: 'Algorand address of the paying wallet.' },
    ],
    response: [
      { name: 'x402.conditions.receiver', type: 'string', desc: 'Algorand address to send ALGO to.' },
      { name: 'x402.conditions.amount', type: 'number', desc: 'Amount in microALGO (e.g. 500000 = 0.5 ALGO).' },
      { name: 'x402.conditions.currency', type: 'string', desc: '"ALGO" — native Algorand payment, no ASA.' },
      { name: 'sessionId', type: 'string (UUID)', desc: 'Session ID to include in X-Payment header.' },
    ],
    example: {
      req: { endpointId: 'uuid-...', consumerWallet: 'ALGO...' },
      res: {
        x402: { conditions: { receiver: 'O575Y...', amount: 500000, currency: 'ALGO' } },
        sessionId: 'uuid-session-id',
      },
    },
  },
  {
    method: 'POST',
    path: '/api/x402/verify',
    tag: 'x402',
    summary: 'Verify x402 Payment',
    description:
      'Verifies a signed Algorand transaction against the session ID. Checks on-chain confirmation, prevents replay attacks via Supabase, and returns the AI output on success.',
    protected: false,
    request: [
      { name: 'txHash', type: 'string', required: true, desc: 'Algorand Transaction ID (base64 or txid).' },
      { name: 'sessionId', type: 'string', required: true, desc: 'Session ID from the challenge response.' },
      { name: 'consumerInput', type: 'string', required: false, desc: 'Input text to pass to the AI engine.' },
    ],
    response: [
      { name: 'status', type: 'string', desc: '"success" on verified payment.' },
      { name: 'aiOutput', type: 'string', desc: 'Generated AI response text.' },
      { name: 'verification.txid', type: 'string', desc: 'Confirmed transaction ID on-chain.' },
      { name: 'verification.sender', type: 'string', desc: 'Algorand address that paid.' },
    ],
    example: {
      req: { txHash: 'ABC123...', sessionId: 'uuid-...', consumerInput: 'Analyze my resume' },
      res: { status: 'success', aiOutput: 'Authenticated Payment Success! Tx: ABC123...', verification: { txid: 'ABC123...', sender: 'ALGO...' } },
    },
  },
  {
    method: 'POST',
    path: '/api/endpoints/create',
    tag: 'Endpoints',
    summary: 'Register AI Endpoint',
    description:
      'Registers a new pay-per-use AI endpoint in the marketplace. The creator sets the price and system prompt — consumers pay per call.',
    protected: false,
    request: [
      { name: 'creatorWallet', type: 'string', required: true, desc: 'Algorand address of the endpoint owner.' },
      { name: 'title', type: 'string', required: true, desc: 'Human-readable endpoint name.' },
      { name: 'priceAlgo', type: 'number', required: true, desc: 'Price per call in ALGO.' },
      { name: 'systemPrompt', type: 'string', required: true, desc: 'System instruction for the AI model.' },
      { name: 'category', type: 'string', required: false, desc: 'Category label (e.g. "resume", "code-review").' },
    ],
    response: [
      { name: 'status', type: 'string', desc: '"success" on creation.' },
      { name: 'endpointId', type: 'string (UUID)', desc: 'Unique ID for the new endpoint.' },
    ],
    example: {
      req: { creatorWallet: 'ALGO...', title: 'Resume Analyzer', priceAlgo: 0.5, systemPrompt: 'You are a brutal recruiter...', category: 'resume' },
      res: { status: 'success', endpointId: 'uuid-...' },
    },
  },
  {
    method: 'GET',
    path: '/api/endpoints',
    tag: 'Endpoints',
    summary: 'List All Endpoints',
    description: 'Returns all registered AI endpoints in the marketplace.',
    protected: false,
    response: [
      { name: 'endpoints[].endpointId', type: 'string', desc: 'UUID of the endpoint.' },
      { name: 'endpoints[].title', type: 'string', desc: 'Endpoint name.' },
      { name: 'endpoints[].priceAlgo', type: 'number', desc: 'Price per call in ALGO.' },
      { name: 'endpoints[].category', type: 'string', desc: 'Category tag.' },
      { name: 'endpoints[].creatorWallet', type: 'string', desc: 'Creator Algorand address.' },
    ],
    example: {
      res: { endpoints: [{ endpointId: 'uuid-...', title: 'Resume Analyzer', priceAlgo: 0.5, category: 'resume', creatorWallet: 'ALGO...' }] },
    },
  },
]

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET: { bg: 'rgba(74,222,128,0.12)', text: '#4ade80' },
  POST: { bg: 'rgba(167,139,250,0.15)', text: '#A78BFA' },
  PUT: { bg: 'rgba(250,204,21,0.12)', text: '#facc15' },
  DELETE: { bg: 'rgba(248,113,113,0.12)', text: '#f87171' },
}

const TAG_COLORS: Record<string, string> = {
  Health: '#4ade80',
  AI: '#A78BFA',
  x402: '#38bdf8',
  Endpoints: '#fb923c',
}

const ApiDocs: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(1) // default open the AI endpoint
  const [activeTab, setActiveTab] = useState<Record<number, 'schema' | 'example'>>({})

  const toggle = (i: number) => setOpenIndex(prev => (prev === i ? null : i))
  const getTab = (i: number) => activeTab[i] ?? 'schema'
  const setTab = (i: number, tab: 'schema' | 'example') =>
    setActiveTab(prev => ({ ...prev, [i]: tab }))

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span style={{
            background: 'rgba(74,222,128,0.12)', color: '#4ade80',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
            padding: '4px 10px', borderRadius: '20px', fontFamily: "'Inter', sans-serif",
          }}>
            LIVE · localhost:8000
          </span>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#A78BFA', fontSize: '12px', fontFamily: "'Inter', sans-serif", textDecoration: 'none' }}
          >
            Open Swagger UI →
          </a>
        </div>
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: '32px',
          fontWeight: 700, color: '#F5F5F5', marginBottom: '10px',
        }}>
          API Reference
        </h2>
        <p style={{ color: '#A0A0A0', fontFamily: "'Inter', sans-serif", fontSize: '15px', lineHeight: '1.7' }}>
          AlgoGate AI backend runs on <code style={{ color: '#A78BFA', background: '#1a1a1a', padding: '2px 6px', borderRadius: '4px' }}>http://localhost:8000</code>.
          All AI endpoints enforce the <strong style={{ color: '#F5F5F5' }}>x402 Payment Protocol</strong> — pay per call with USDC on Algorand TestNet.
        </p>
      </div>

      {/* Base URL bar */}
      <div style={{
        background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '10px',
        padding: '12px 20px', marginBottom: '24px', display: 'flex',
        alignItems: 'center', gap: '12px', fontFamily: 'monospace', fontSize: '13px',
      }}>
        <span style={{ color: '#666' }}>BASE URL</span>
        <span style={{ color: '#A78BFA' }}>http://localhost:8000</span>
        <span style={{ marginLeft: 'auto', color: '#666', fontSize: '11px' }}>Content-Type: application/json</span>
      </div>

      {/* Endpoint list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {ENDPOINTS.map((ep, i) => {
          const mc = METHOD_COLORS[ep.method]
          const isOpen = openIndex === i
          const tab = getTab(i)

          return (
            <div
              key={i}
              style={{
                background: '#0a0a0a',
                border: `1px solid ${isOpen ? '#3a3a3a' : '#1e1e1e'}`,
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Row header */}
              <button
                onClick={() => toggle(i)}
                style={{
                  width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  padding: '16px 20px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: '14px',
                }}
              >
                {/* Method badge */}
                <span style={{
                  background: mc.bg, color: mc.text,
                  fontFamily: 'monospace', fontSize: '11px', fontWeight: 700,
                  padding: '3px 10px', borderRadius: '6px', minWidth: '44px', textAlign: 'center',
                }}>
                  {ep.method}
                </span>

                {/* Path */}
                <span style={{
                  fontFamily: 'monospace', fontSize: '14px', color: '#F5F5F5', flex: 1,
                }}>
                  {ep.path}
                </span>

                {/* Tag */}
                <span style={{
                  color: TAG_COLORS[ep.tag] ?? '#A0A0A0',
                  fontSize: '11px', fontFamily: "'Inter', sans-serif",
                  fontWeight: 600, letterSpacing: '0.05em',
                  background: 'rgba(255,255,255,0.04)',
                  padding: '2px 8px', borderRadius: '4px',
                }}>
                  {ep.tag}
                </span>

                {/* Protected badge */}
                {ep.protected && (
                  <span style={{
                    color: '#facc15', fontSize: '10px',
                    background: 'rgba(250,204,21,0.1)',
                    padding: '2px 8px', borderRadius: '4px',
                    fontFamily: "'Inter', sans-serif", fontWeight: 600,
                  }}>
                    🔒 x402
                  </span>
                )}

                {/* Summary */}
                <span style={{ color: '#666', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}>
                  {ep.summary}
                </span>

                {/* Chevron */}
                <span style={{
                  color: '#444', fontSize: '16px',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}>
                  ▼
                </span>
              </button>

              {/* Expanded body */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      borderTop: '1px solid #1e1e1e',
                      padding: '20px 24px 24px',
                    }}>
                      {/* Description */}
                      <p style={{
                        color: '#A0A0A0', fontFamily: "'Inter', sans-serif",
                        fontSize: '14px', lineHeight: '1.7', marginBottom: '20px',
                      }}>
                        {ep.description}
                      </p>

                      {/* x402 flow hint */}
                      {ep.protected && (
                        <div style={{
                          background: 'rgba(250,204,21,0.06)',
                          border: '1px solid rgba(250,204,21,0.2)',
                          borderRadius: '8px', padding: '12px 16px',
                          marginBottom: '20px', fontFamily: "'Inter', sans-serif",
                          fontSize: '13px', color: '#facc15',
                        }}>
                          <strong>x402 Flow:</strong> First call returns{' '}
                          <code style={{ background: '#1a1a1a', padding: '1px 5px', borderRadius: '3px' }}>
                            402 Payment Required
                          </code>{' '}
                          with challenge. Resend with{' '}
                          <code style={{ background: '#1a1a1a', padding: '1px 5px', borderRadius: '3px' }}>
                            X-Payment: tx64=&lt;base64_signed_txn&gt;, session=&lt;sessionId&gt;
                          </code>
                        </div>
                      )}

                      {/* Tabs */}
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                        {(['schema', 'example'] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setTab(i, t)}
                            style={{
                              background: tab === t ? '#1e1e1e' : 'transparent',
                              border: `1px solid ${tab === t ? '#3a3a3a' : 'transparent'}`,
                              color: tab === t ? '#F5F5F5' : '#666',
                              fontFamily: "'Inter', sans-serif", fontSize: '12px',
                              fontWeight: 600, padding: '5px 14px', borderRadius: '6px',
                              cursor: 'pointer', textTransform: 'capitalize',
                            }}
                          >
                            {t === 'schema' ? 'Schema' : 'Example'}
                          </button>
                        ))}
                      </div>

                      {tab === 'schema' && (
                        <div style={{ display: 'grid', gridTemplateColumns: ep.request ? '1fr 1fr' : '1fr', gap: '16px' }}>
                          {/* Request */}
                          {ep.request && (
                            <div>
                              <div style={{ color: '#666', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '10px', fontFamily: "'Inter', sans-serif" }}>
                                REQUEST BODY
                              </div>
                              <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', overflow: 'hidden' }}>
                                {ep.request.map((f, fi) => (
                                  <div key={fi} style={{
                                    padding: '10px 14px',
                                    borderBottom: fi < (ep.request?.length ?? 0) - 1 ? '1px solid #1a1a1a' : 'none',
                                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                                  }}>
                                    <div style={{ flex: 1 }}>
                                      <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#A78BFA' }}>{f.name}</span>
                                      {f.required && <span style={{ color: '#f87171', marginLeft: '4px', fontSize: '10px' }}>*</span>}
                                      <span style={{ color: '#555', fontSize: '11px', fontFamily: "'Inter', sans-serif", marginLeft: '8px' }}>{f.type}</span>
                                    </div>
                                    <div style={{ color: '#666', fontSize: '12px', fontFamily: "'Inter', sans-serif", textAlign: 'right', maxWidth: '55%' }}>
                                      {f.desc}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Response */}
                          <div>
                            <div style={{ color: '#666', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '10px', fontFamily: "'Inter', sans-serif" }}>
                              RESPONSE (200 OK)
                            </div>
                            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', overflow: 'hidden' }}>
                              {ep.response.map((f, fi) => (
                                <div key={fi} style={{
                                  padding: '10px 14px',
                                  borderBottom: fi < ep.response.length - 1 ? '1px solid #1a1a1a' : 'none',
                                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                                }}>
                                  <div style={{ flex: 1 }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#4ade80' }}>{f.name}</span>
                                    <span style={{ color: '#555', fontSize: '11px', fontFamily: "'Inter', sans-serif", marginLeft: '8px' }}>{f.type}</span>
                                  </div>
                                  <div style={{ color: '#666', fontSize: '12px', fontFamily: "'Inter', sans-serif", textAlign: 'right', maxWidth: '55%' }}>
                                    {f.desc}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {tab === 'example' && ep.example && (
                        <div style={{ display: 'grid', gridTemplateColumns: ep.example.req ? '1fr 1fr' : '1fr', gap: '16px' }}>
                          {ep.example.req && (
                            <div>
                              <div style={{ color: '#666', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '8px', fontFamily: "'Inter', sans-serif" }}>
                                REQUEST
                              </div>
                              <pre style={{
                                background: '#111', border: '1px solid #1e1e1e',
                                borderRadius: '8px', padding: '16px', margin: 0,
                                fontFamily: 'monospace', fontSize: '12px',
                                color: '#F5F5F5', overflowX: 'auto', lineHeight: '1.6',
                              }}>
                                {JSON.stringify(ep.example.req, null, 2)}
                              </pre>
                            </div>
                          )}
                          <div>
                            <div style={{ color: '#666', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '8px', fontFamily: "'Inter', sans-serif" }}>
                              RESPONSE
                            </div>
                            <pre style={{
                              background: '#111', border: '1px solid #1e1e1e',
                              borderRadius: '8px', padding: '16px', margin: 0,
                              fontFamily: 'monospace', fontSize: '12px',
                              color: '#4ade80', overflowX: 'auto', lineHeight: '1.6',
                            }}>
                              {JSON.stringify(ep.example.res, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ApiDocs
