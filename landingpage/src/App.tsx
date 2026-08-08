import {
  Wallet,
  Coins,
  Clock,
  ArrowUpRight,
  PiggyBank,
  CircleDollarSign,
  ArrowRight,
} from 'lucide-react'
import { Link, Route, Routes } from 'react-router-dom'
import mascot from './assets/seekerbud-mascot.png'
import { LegalPage } from './Legal.tsx'
import './index.css'

const FEATURES = [
  {
    Icon: Wallet,
    color: 'var(--purple)',
    title: 'Balances, in plain English',
    desc: 'Ask “how much SOL do I have?” and get a straight answer. No dashboards, no dapp-hopping.',
  },
  {
    Icon: Coins,
    color: 'var(--blue)',
    title: 'Know what you own',
    desc: 'SeekerBud explains the tokens in your wallet — what they are and why they matter.',
  },
  {
    Icon: Clock,
    color: 'var(--green)',
    title: 'Activity, summarised',
    desc: 'Recent transfers, swaps and payments, told back to you like a story.',
  },
  {
    Icon: ArrowUpRight,
    color: 'var(--orange)',
    title: 'Send with a message',
    desc: '“Send 5 SOL to Alice.” SeekerBud drafts the transaction, you approve with a fingerprint.',
  },
]

const PAYMENTS = [
  {
    Icon: PiggyBank,
    color: 'var(--purple)',
    dot: '#9945FF',
    rate: 'top-up once, chat freely',
    title: 'Prepaid wallet',
    desc: 'A few cents of USDC per message, settled through x402. Load a balance, never think about billing again.',
  },
  {
    Icon: CircleDollarSign,
    color: 'var(--green)',
    dot: '#0ABF79',
    rate: 'signed per message',
    title: 'Pay as you go',
    desc: 'No balance required. Each message is authorized by your Seed Vault — biometrics only, keys never leave your phone.',
  },
]

function App() {
  return (
    <>
      {/* ── Nav ── */}
      <nav className="nav">
        <div className="wrap navInner">
          <a href="#top" className="brand">
            SeekerBud
          </a>
          <div className="navLinks">
            <a href="#features">Capabilities</a>
            <a href="#payments">Payments</a>
          </div>
          <a href="#get-started" className="btn btnSmall">
            Get the app
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header id="top" className="wrap hero">
        <div className="heroCopy">
          <span className="eyebrow">An AI in your wallet — Solana Mobile</span>
          <h1>
            Chat with your wallet.
            <br />
            <em>Control your Solana.</em>
          </h1>
          <p>
            SeekerBud is an assistant that lives in your Solana Mobile wallet.
            Ask for balances, dig into tokens and move funds — in the same
            conversation you’d have with a friend.
          </p>
          <div className="heroCtas">
            <a href="#get-started" className="btn">
              Get SeekerBud <ArrowRight size={16} />
            </a>
            <a href="#features" className="btn">
              What it can do
            </a>
          </div>
          <div className="heroMeta">
            <span>
              <span className="dot" style={{ background: '#0ABF79' }} />
              biometrics only
            </span>
            <span>
              <span className="dot" style={{ background: '#9945FF' }} />
              non-custodial
            </span>
            <span>
              <span className="dot" style={{ background: '#E8871A' }} />
              ¢ per message
            </span>
          </div>
        </div>

        <figure className="figure">
          <img src={mascot} alt="SeekerBud mascot" />
        </figure>
      </header>

      <hr className="rule" />

      {/* ── Capabilities ── */}
      <section id="features" className="section">
        <div className="wrap">
          <div className="sectionHead">
            <h2>What it does</h2>
            <p>
              Four verbs cover most of what people do with a wallet. SeekerBud
              does them all in a thread.
            </p>
          </div>
          <div className="featureList">
            {FEATURES.map(({ Icon, color, title, desc }, i) => (
              <div key={title} className="featureRow">
                <span className="featureNum">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="featureIcon">
                  <Icon size={20} color={color} />
                </span>
                <div className="featureBody">
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Payments ── */}
      <section id="payments" className="section">
        <div className="wrap">
          <div className="sectionHead">
            <h2>How you pay</h2>
            <p>
              No subscriptions. Messages are metered in USDC through the x402
              payment protocol.
            </p>
          </div>
          <div className="payGrid">
            {PAYMENTS.map(({ Icon, color, dot, rate, title, desc }) => (
              <div key={title} className="payCard">
                <span className="featureIcon">
                  <Icon size={20} color={color} />
                </span>
                <div>
                  <span className="rate">
                    <span className="dot" style={{ background: dot }} />
                    {rate}
                  </span>
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="get-started" className="section">
        <div className="wrap">
          <div className="ctaBand">
            <span className="eyebrow">Available on Solana Mobile</span>
            <h2>Your wallet is about to talk back.</h2>
            <p>
              Install SeekerBud on your Solana phone. One fingerprint and you’re
              in.
            </p>
            <a href="#top" className="btn">
              Get SeekerBud <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="wrap footerInner">
          <Link to="/" className="footerBrand">
            SeekerBud
          </Link>
          <span>© {new Date().getFullYear()} · Built on Solana</span>
          <span>
            <Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link>
          </span>
        </div>
      </footer>
    </>
  )
}

export default function AppRoot() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/terms" element={<LegalPage kind="terms" />} />
      <Route path="/privacy" element={<LegalPage kind="privacy" />} />
    </Routes>
  )
}
