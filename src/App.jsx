import { useState } from 'react'
import LancarGasto from './LancarGasto'
import Planejamento from './Planejamento'
import Dashboard from './Dashboard'
import DespesasVariaveis from './DespesasVariaveis'
import Emprestimos from './Emprestimos'
import CartaoCredito from './CartaoCredito'
import Cadastros from './Cadastros'

const TELAS = [
  { key: 'dashboard',          label: 'Dashboard',    icon: '📊' },
  { key: 'lancar',             label: 'Lançar',       icon: '＋' },
  { key: 'cartao',             label: 'Cartão',       icon: '💳' },
  { key: 'despesas-variaveis', label: 'Variáveis',    icon: '📈' },
  { key: 'emprestimos',        label: 'Empréstimos',  icon: '🏦' },
  { key: 'planejamento',       label: 'Planejamento', icon: '📅' },
  { key: 'cadastros',           label: 'Cadastros',    icon: '⚙️' },
]

export default function App() {
  const [tela, setTela] = useState('dashboard')

  return (
    <div style={s.root}>
      <style>{css}</style>

      <div style={s.content}>
        {tela === 'dashboard'          && <Dashboard />}
        {tela === 'lancar'             && <LancarGasto />}
        {tela === 'cartao'             && <CartaoCredito />}
        {tela === 'despesas-variaveis' && <DespesasVariaveis />}
        {tela === 'emprestimos'        && <Emprestimos />}
        {tela === 'planejamento'       && <Planejamento />}
        {tela === 'cadastros'           && <Cadastros />}
      </div>

      {/* Nav inferior — mobile */}
      <nav style={s.navMobile}>
        {TELAS.map(t => (
          <button
            key={t.key}
            style={{ ...s.navBtn, ...(tela === t.key ? s.navBtnAtivo : {}) }}
            onClick={() => setTela(t.key)}
          >
            <span style={s.navIcon}>{t.icon}</span>
            <span style={s.navLabel}>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Nav lateral — desktop */}
      <nav style={s.navDesktop}>
        <div style={s.navDesktopLogo}>FF</div>
        {TELAS.map(t => (
          <button
            key={t.key}
            style={{ ...s.navDesktopBtn, ...(tela === t.key ? s.navDesktopBtnAtivo : {}) }}
            onClick={() => setTela(t.key)}
          >
            <span style={s.navIcon}>{t.icon}</span>
            <span style={s.navDesktopLabel}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

const s = {
  root:    { display: 'flex', minHeight: '100dvh', background: '#080f1a' },
  content: { flex: 1, paddingBottom: 72 },

  navMobile: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    height: 64, background: '#0a1120',
    borderTop: '1px solid #1e293b',
    display: 'flex', zIndex: 100,
  },
  navBtn: {
    flex: 1, background: 'none', border: 'none',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 3,
    cursor: 'pointer', color: '#475569', transition: 'color 0.15s',
  },
  navBtnAtivo: { color: '#7c3aed' },
  navIcon:     { fontSize: 15, lineHeight: 1 },
  navLabel:    { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },

  navDesktop: {
    display: 'none',
    width: 200, background: '#060d18',
    borderRight: '1px solid #1e293b',
    flexDirection: 'column', alignItems: 'stretch',
    padding: '24px 12px', gap: 4,
    position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
  },
  navDesktopLogo: {
    fontSize: 20, fontWeight: 900, color: '#7c3aed',
    letterSpacing: 2, padding: '8px 16px 24px',
    fontFamily: "'Syne', sans-serif",
  },
  navDesktopBtn: {
    background: 'none', border: 'none',
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 16px', borderRadius: 10,
    cursor: 'pointer', color: '#475569', transition: 'all 0.15s',
    textAlign: 'left',
  },
  navDesktopBtnAtivo: { background: '#130a2a', color: '#a78bfa' },
  navDesktopLabel: { fontSize: 14, fontWeight: 600, fontFamily: "'Syne', sans-serif" },
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&display=swap');
  @media (min-width: 768px) {
    body > div > nav:nth-child(3) { display: none !important; }
    body > div > nav:nth-child(2) { display: flex !important; }
    body > div > div:first-child  { margin-left: 200px; padding-bottom: 0 !important; }
  }
`
