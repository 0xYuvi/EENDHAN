import React from 'react'
import { motion } from 'framer-motion'
import { Zap, ShieldCheck, Gem, Bot, ArrowRight, ChevronRight } from 'lucide-react'
import GatewayTester from '../components/GatewayTester'
import CreatorPortal from '../components/CreatorPortal'
import ApiDocs from '../components/ApiDocs'
import { GlobalTouchEffect } from '../components/TouchEffect'

/* ═══════════════════════════════════════════════════════════════
   Animation variants
   ═══════════════════════════════════════════════════════════════ */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

/* ═══════════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════════ */
const featurePills = [
  'x402 Standard',
  'Pay-Per-Use',
  'No Subscriptions',
  'Replay-Proof',
  'Instant Settlement',
  'Agent-Native',
  'Algorand L1',
  'Sub-Second Finality',
]

const featureCards = [
  {
    icon: Zap,
    title: 'x402 Payment Protocol',
    desc: 'HTTP 402 Payment Required — the web standard for machine-to-machine payments, finally realized.',
  },
  {
    icon: ShieldCheck,
    title: 'Pay-Before-Inference',
    desc: 'Zero credit risk. Payment is verified on-chain before any AI compute is consumed.',
  },
  {
    icon: Gem,
    title: 'Algorand Settlement',
    desc: 'Sub-second finality, negligible fees, and carbon-negative infrastructure for every transaction.',
  },
  {
    icon: Bot,
    title: 'Agent Compatible',
    desc: 'Built for autonomous AI agents — any LLM, any framework, any chain of tools.',
  },
]

const steps = [
  {
    num: '01',
    title: 'Request the API',
    desc: 'Your agent calls any AlgoGate-protected AI endpoint with a standard HTTP request.',
  },
  {
    num: '02',
    title: 'Receive 402 Challenge',
    desc: 'The server responds with HTTP 402 — amount, wallet, session ID, nonce, and a 30-second window.',
  },
  {
    num: '03',
    title: 'Pay & Unlock',
    desc: 'Submit the Algorand transaction hash. Payment is verified on-chain, and the AI response is returned.',
  },
]

/* ═══════════════════════════════════════════════════════════════
   Code Block component (Fix 1 — right column)
   ═══════════════════════════════════════════════════════════════ */
const CodeBlock: React.FC = () => {
  const purple = '#A78BFA'
  const orange = '#E8856A'
  const green = '#4ADE80'
  const white = '#F5F5F5'
  const muted = '#666'

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: '#0D0D0D',
        border: '1px solid #2a2a2a',
        borderRadius: '16px',
        padding: '32px',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: '13px',
        lineHeight: '1.7',
        overflow: 'auto',
        position: 'relative',
      }}
    >
      {/* Terminal dots */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }} />
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c940' }} />
      </div>

      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        <span style={{ color: muted }}>POST</span>{' '}
        <span style={{ color: white }}>/api/execute/agent-xyz</span>
        {'\n\n'}
        <span style={{ color: muted }}>←</span>{' '}
        <span style={{ color: orange }}>402 Payment Required</span>
        {'\n'}
        <span style={{ color: purple }}>{'   '}amount:</span>{' '}
        <span style={{ color: white }}>"0.1 ALGO"</span>
        {'\n'}
        <span style={{ color: purple }}>{'   '}sessionId:</span>{' '}
        <span style={{ color: white }}>"sess_k92mxP..."</span>
        {'\n'}
        <span style={{ color: purple }}>{'   '}nonce:</span>{' '}
        <span style={{ color: white }}>"a8f3c1..."</span>
        {'\n'}
        <span style={{ color: purple }}>{'   '}expiresAt:</span>{' '}
        <span style={{ color: white }}>"30s"</span>
        {'\n\n'}
        <span style={{ color: muted }}>POST</span>{' '}
        <span style={{ color: white }}>/api/execute/agent-xyz</span>
        {'\n'}
        <span style={{ color: purple }}>{'   '}txHash:</span>{' '}
        <span style={{ color: white }}>"ALGO7xK..."</span>
        {'\n\n'}
        <span style={{ color: muted }}>←</span>{' '}
        <span style={{ color: green }}>200 OK</span>
        {'\n'}
        <span style={{ color: purple }}>{'   '}AI response unlocked</span>{' '}
        <span style={{ color: green }}>✓</span>
      </pre>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Feature Card component (Fix 2 — Lucide icons)
   ═══════════════════════════════════════════════════════════════ */
const FeatureCard: React.FC<{
  icon: React.ElementType
  title: string
  desc: string
  index: number
}> = ({ icon: Icon, title, desc, index }) => {
  const [hovered, setHovered] = React.useState(false)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0, cX: 0, cY: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setMousePos({ 
      x, 
      y, 
      cX: x - (rect.width / 2), 
      cY: y - (rect.height / 2) 
    })
  }

  // 3D Tilt parameters
  const rotateX = hovered ? -(mousePos.cY / 25) : 0
  const rotateY = hovered ? (mousePos.cX / 25) : 0

  // Magnetism offsets
  const tx = hovered ? (mousePos.cX / 15) : 0
  const ty = hovered ? (mousePos.cY / 15) : 0

  return (
    <motion.div
      ref={cardRef}
      custom={index}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: '#111111',
        border: '1px solid transparent',
        borderRadius: '16px',
        padding: '32px',
        cursor: 'default',
        transform: hovered 
          ? `translateY(-4px) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)` 
          : 'translateY(0) perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
        transition: hovered ? 'box-shadow 0.25s ease' : 'transform 0.4s ease-out, box-shadow 0.25s ease, border 0.3s ease',
        boxShadow: hovered ? '0 15px 40px rgba(167, 139, 250, 0.1)' : 'none',
      }}
    >
      {/* Outer Border Glow */}
      <div 
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(167, 139, 250, 0.8), transparent 40%)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none',
          borderRadius: '16px',
          zIndex: -2,
          margin: '-1px'
        }}
      />
      {/* Inner dark background mask */}
      <div 
        style={{
          position: 'absolute',
          top: 1, left: 1, right: 1, bottom: 1,
          background: '#111111',
          borderRadius: '15px',
          zIndex: -1,
          pointerEvents: 'none'
        }}
      />
      {/* Magic Bento Glow Spotlight */}
      <div 
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(167, 139, 250, 0.12), transparent 40%)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      <div 
        style={{ 
          position: 'relative', 
          zIndex: 1,
          transform: `translate(${tx}px, ${ty}px)`,
          transition: hovered ? 'none' : 'transform 0.4s ease-out'
        }}
      >
        {/* Icon container */}
        <div
          style={{
            background: 'rgba(167,139,250,0.15)',
            borderRadius: '12px',
            padding: '12px',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: hovered ? 'scale(1.15) rotate(-5deg)' : 'scale(1) rotate(0deg)'
          }}
        >
          <Icon size={24} color="#A78BFA" />
        </div>

        <h3
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '18px',
            fontWeight: 600,
            color: '#F5F5F5',
            marginBottom: '10px',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#A0A0A0',
          }}
        >
          {desc}
        </p>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Landing Page
   ═══════════════════════════════════════════════════════════════ */
const LandingPage: React.FC = () => {
  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      <GlobalTouchEffect />
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: '160px',
          paddingBottom: '100px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '800px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Badge */}
          <motion.div custom={0} variants={fadeUp}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(167,139,250,0.1)',
                border: '1px solid rgba(167,139,250,0.2)',
                borderRadius: '9999px',
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#A78BFA',
                marginBottom: '32px',
              }}
            >
              <Zap size={14} />
              x402 Protocol · Live on Algorand Testnet
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            custom={1}
            variants={fadeUp}
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: '#F5F5F5',
              maxWidth: '900px',
              margin: '0 auto 24px',
            }}
          >
            PAY ONCE.
            <br />
            <span style={{ color: '#A78BFA' }}>GET THE AI.</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            custom={2}
            variants={fadeUp}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              lineHeight: 1.6,
              color: '#A0A0A0',
              maxWidth: '600px',
              margin: '0 auto 40px',
            }}
          >
            x402-powered pay-per-use access for premium AI APIs — built on Algorand.
            No subscriptions. No API keys. Just pay and unlock.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            custom={3}
            variants={fadeUp}
            style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <a
              href="#sandbox"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#A78BFA',
                color: '#fff',
                padding: '14px 32px',
                borderRadius: '9999px',
                fontSize: '15px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#9171e8'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#A78BFA'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Test API Proxy
              <ArrowRight size={16} />
            </a>
            <a
              href="#how-it-works"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'transparent',
                color: '#A0A0A0',
                padding: '14px 32px',
                borderRadius: '9999px',
                fontSize: '15px',
                fontWeight: 500,
                border: '1px solid #2a2a2a',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#A78BFA'
                e.currentTarget.style.color = '#F5F5F5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2a2a2a'
                e.currentTarget.style.color = '#A0A0A0'
              }}
            >
              How It Works
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* ── WHY ALGOGATE (Fix 1 — 2-column layout) ──────────── */}
      <section id="features" style={{ padding: '80px 5vw', maxWidth: '1280px', margin: '0 auto' }}>
        {/* 2-column layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '48px',
            alignItems: 'center',
            marginBottom: '48px',
          }}
          className="why-grid"
        >
          {/* Left column — text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span
              style={{
                display: 'inline-block',
                fontFamily: "'Inter', sans-serif",
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#A78BFA',
                marginBottom: '16px',
              }}
            >
              WHY ALGOGATE
            </span>
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: '#F5F5F5',
                marginBottom: '20px',
              }}
            >
              The x402 payment layer
              <br />
              for AI inference
            </h2>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '16px',
                lineHeight: 1.7,
                color: '#A0A0A0',
                maxWidth: '480px',
              }}
            >
              AlgoGate implements the HTTP 402 Payment Required standard to create a seamless,
              trustless payment proxy between AI consumers and AI creators. Call any registered endpoint dynamically.
            </p>
          </motion.div>

          {/* Right column — code block */}
          <CodeBlock />
        </div>

        {/* Feature pills — full width, flex wrap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {featurePills.map((pill) => (
            <span
              key={pill}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                fontWeight: 500,
                color: '#A0A0A0',
                background: '#111111',
                border: '1px solid #2a2a2a',
                borderRadius: '9999px',
                padding: '8px 20px',
                transition: 'all 0.2s ease',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#A78BFA'
                e.currentTarget.style.color = '#A78BFA'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2a2a2a'
                e.currentTarget.style.color = '#A0A0A0'
              }}
            >
              {pill}
            </span>
          ))}
        </motion.div>
      </section>

      {/* ── FEATURE CARDS (Fix 2 — Lucide icons, 2×2 grid) ──── */}
      <section style={{ padding: '80px 5vw', maxWidth: '1280px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '48px' }}
        >
          <span
            style={{
              display: 'inline-block',
              fontFamily: "'Inter', sans-serif",
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#A78BFA',
              marginBottom: '16px',
            }}
          >
            CORE FEATURES
          </span>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
              fontWeight: 700,
              color: '#F5F5F5',
              letterSpacing: '-0.02em',
            }}
          >
            Built for the agentic economy
          </h2>
        </motion.div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '20px',
          }}
          className="features-grid"
        >
          {featureCards.map((card, i) => (
            <FeatureCard key={card.title} icon={card.icon} title={card.title} desc={card.desc} index={i} />
          ))}
        </div>
      </section>

      {/* ── GATEWAY SANDBOX ──────────────────────────────────────── */}
      <section
        id="sandbox"
        style={{
          padding: '100px 5vw',
          maxWidth: '1280px',
          margin: '0 auto',
        }}
      >
        <GatewayTester />
      </section>

      {/* ── STATS STRIP ──────────────────────────────────────── */}
      <section
        style={{
          padding: '48px 5vw',
          maxWidth: '100%',
          background: '#0A0A0A',
          borderTop: '1px solid #1a1a1a',
          borderBottom: '1px solid #1a1a1a',
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px',
          }}
          className="stats-strip"
        >
          {[
            { value: '0.1 ALGO', label: 'per API call' },
            { value: '<3s', label: 'settlement time' },
            { value: '0', label: 'subscriptions needed' },
            { value: '∞', label: 'replay-proof security' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center', flex: '1 1 140px' }}>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#A78BFA',
                  marginBottom: '4px',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '13px',
                  color: '#666',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '100px 5vw', maxWidth: '1280px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '64px' }}
        >
          <span
            style={{
              display: 'inline-block',
              fontFamily: "'Inter', sans-serif",
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#A78BFA',
              marginBottom: '16px',
            }}
          >
            HOW IT WORKS
          </span>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
              fontWeight: 700,
              color: '#F5F5F5',
              letterSpacing: '-0.02em',
            }}
          >
            Three steps. Zero trust assumptions.
          </h2>
        </motion.div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
          }}
          className="steps-grid"
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              style={{
                background: '#111111',
                border: '1px solid #2a2a2a',
                borderRadius: '16px',
                padding: '36px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '64px',
                  fontWeight: 700,
                  color: 'rgba(167,139,250,0.08)',
                  lineHeight: 1,
                  marginBottom: '16px',
                }}
              >
                {step.num}
              </div>
              <h3
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#F5F5F5',
                  marginBottom: '12px',
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: '#A0A0A0',
                }}
              >
                {step.desc}
              </p>
              {i < steps.length - 1 && (
                <div
                  className="step-arrow"
                  style={{
                    position: 'absolute',
                    right: '-16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#2a2a2a',
                    zIndex: 2,
                  }}
                >
                  <ChevronRight size={24} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CREATOR REGISTRATION ─────────────────────────────────── */}
      <section
        id="register"
        style={{
          padding: '100px 5vw 0',
          maxWidth: '1280px',
          margin: '0 auto',
        }}
      >
        <CreatorPortal />
      </section>

      {/* ── GATEWAY SANDBOX ──────────────────────────────────────── */}
      <section
        id="sandbox"
        style={{
          padding: '100px 5vw',
          maxWidth: '1280px',
          margin: '0 auto',
        }}
      >
        <GatewayTester />
      </section>

      {/* ── API DOCS ─────────────────────────────────────────── */}
      <section
        id="docs"
        style={{
          padding: '100px 5vw',
          maxWidth: '1280px',
          margin: '0 auto',
          borderTop: '1px solid #1a1a1a',
        }}
      >
        <ApiDocs />
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer
        style={{
          padding: '40px 5vw',
          borderTop: '1px solid #1a1a1a',
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '14px',
            fontWeight: 600,
            color: '#666',
          }}
        >
          AlgoGate<span style={{ color: '#A78BFA' }}>AI</span>{' '}
          <span style={{ fontWeight: 400 }}>© 2026</span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          {['Docs', 'GitHub', 'Discord'].map((link) => (
            <a
              key={link}
              href="#"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                color: '#666',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#A78BFA')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
            >
              {link}
            </a>
          ))}
        </div>
      </footer>

      {/* ── Responsive styles ────────────────────────────────── */}
      <style>{`
        @media (max-width: 900px) {
          .why-grid {
            grid-template-columns: 1fr !important;
          }
          .features-grid {
            grid-template-columns: 1fr !important;
          }
          .steps-grid {
            grid-template-columns: 1fr !important;
          }
          .step-arrow {
            display: none !important;
          }
          .stats-strip {
            justify-content: center !important;
          }
        }
      `}</style>
    </div>
  )
}

export default LandingPage
