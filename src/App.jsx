import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  PlusCircle,
  CreditCard,
  ScrollText,
  TrendingDown,
  Landmark,
  RefreshCw,
  CalendarDays,
  Settings,
  Wallet,
} from 'lucide-react'
import LancarGasto from './LancarGasto'
import Planejamento from './Planejamento'
import Dashboard from './Dashboard'
import DespesasVariaveis from './DespesasVariaveis'
import Emprestimos from './Emprestimos'
import CartaoCredito from './CartaoCredito'
import Cadastros from './Cadastros'
import Extrato from './Extrato'
import Recorrencias from './Recorrencias'

const TELAS = [
  { key: 'dashboard',          label: 'Dashboard',    Icon: LayoutDashboard },
  { key: 'lancar',             label: 'Lancar',       Icon: PlusCircle },
  { key: 'cartao',             label: 'Cartao',       Icon: CreditCard },
  { key: 'extrato',            label: 'Extrato',      Icon: ScrollText },
  { key: 'despesas-variaveis', label: 'Variaveis',    Icon: TrendingDown },
  { key: 'emprestimos',        label: 'Emprestimos',  Icon: Landmark },
  { key: 'recorrencias',       label: 'Recorrencias', Icon: RefreshCw },
  { key: 'planejamento',       label: 'Planejamento', Icon: CalendarDays },
  { key: 'cadastros',          label: 'Cadastros',    Icon: Settings },
]

export default function App() {
  const [tela, setTela] = useState('dashboard')

  useEffect(() => {
    const corrigir = (texto) => texto
      .replaceAll('ÃƒÂ§', 'ç')
      .replaceAll('ÃƒÂ£', 'ã')
      .replaceAll('ÃƒÂ¡', 'á')
      .replaceAll('ÃƒÂ©', 'é')
      .replaceAll('ÃƒÂª', 'ê')
      .replaceAll('ÃƒÂ­', 'í')
      .replaceAll('ÃƒÂ³', 'ó')
      .replaceAll('ÃƒÂº', 'ú')
      .replaceAll('ÃƒÂµ', 'õ')
      .replaceAll('ÃƒÂ´', 'ô')
      .replaceAll('Ãƒ', 'í')

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    nodes.forEach(node => {
      const novo = corrigir(node.nodeValue)
      if (novo !== node.nodeValue) node.nodeValue = novo
    })
  }, [tela])

  return (
    <div style={s.root}>
      <style>{css}</style>

      <div id="app-content" style={s.content}>
        {tela === 'dashboard'          && <Dashboard />}
        {tela === 'lancar'             && <LancarGasto />}
        {tela === 'cartao'             && <CartaoCredito />}
        {tela === 'extrato'            && <Extrato />}
        {tela === 'despesas-variaveis' && <DespesasVariaveis />}
        {tela === 'emprestimos'        && <Emprestimos />}
        {tela === 'recorrencias'       && <Recorrencias />}
        {tela === 'planejamento'       && <Planejamento />}
        {tela === 'cadastros'          && <Cadastros />}
      </div>

      <nav id="app-nav-mobile" style={s.navMobile}>
        {TELAS.map(({ key, label, Icon }) => {
          const ativo = tela === key
          return (
            <button
              key={key}
              style={{ ...s.navBtn, ...(ativo ? s.navBtnAtivo : {}) }}
              onClick={() => setTela(key)}
            >
              <span style={{ ...s.navIconWrap, ...(ativo ? s.navIconWrapAtivo : {}) }}>
                <Icon size={18} strokeWidth={ativo ? 2.2 : 1.8} />
              </span>
              <span style={s.navLabel}>{label}</span>
            </button>
          )
        })}
      </nav>

      <nav id="app-nav-desktop" style={s.navDesktop}>
        <div style={s.navDesktopLogoWrap}>
          <div style={s.navDesktopLogoIcon}>
            <Wallet size={20} strokeWidth={2} color="#fff" />
          </div>
          <span style={s.navDesktopLogoText}>Financas</span>
        </div>

        <div style={s.navDesktopDivider} />

        {TELAS.map(({ key, label, Icon }) => {
          const ativo = tela === key
          return (
            <button
              key={key}
              style={{ ...s.navDesktopBtn, ...(ativo ? s.navDesktopBtnAtivo : {}) }}
              onClick={() => setTela(key)}
            >
              {ativo && <div style={s.navDesktopActivePill} />}
              <Icon
                size={18}
                strokeWidth={ativo ? 2.2 : 1.8}
                color={ativo ? '#10b981' : '#6b7280'}
              />
              <span style={{ ...s.navDesktopLabel, color: ativo ? '#e2e8f0' : '#6b7280' }}>
                {label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

const s = {
  root:    { display: 'flex', minHeight: '100dvh', background: '#0f1419' },
  content: { flex: 1, paddingBottom: 72 },

  navMobile: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    height: 68,
    background: 'rgba(15,20,25,0.92)',
    backdropFilter: 'blur(20px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
    borderTop: '1px solid #2a2f3e',
    display: 'flex', zIndex: 100,
    overflowX: 'auto', overflowY: 'hidden',
    scrollbarWidth: 'none',
  },
  navBtn: {
    flex: '0 0 auto', minWidth: 68, background: 'none', border: 'none',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 4,
    cursor: 'pointer', color: '#6b7280', transition: 'color 0.2s ease',
    padding: '0 6px',
  },
  navBtnAtivo: { color: '#10b981' },
  navIconWrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 10,
    transition: 'all 0.2s ease',
  },
  navIconWrapAtivo: {
    background: 'rgba(16,185,129,0.12)',
    boxShadow: '0 0 12px rgba(16,185,129,0.2)',
  },
  navLabel: {
    fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: 0.5, lineHeight: 1,
  },

  navDesktop: {
    display: 'none',
    width: 220,
    background: '#0a0e14',
    borderRight: '1px solid #2a2f3e',
    flexDirection: 'column', alignItems: 'stretch',
    padding: '20px 12px',
    gap: 2,
    position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
  },
  navDesktopLogoWrap: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '4px 12px 20px',
  },
  navDesktopLogoIcon: {
    background: 'linear-gradient(135deg, #10b981, #14b8a6)',
    borderRadius: 10, padding: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
  },
  navDesktopLogoText: {
    fontSize: 16, fontWeight: 800,
    background: 'linear-gradient(to right, #fff, #6ee7b7)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    letterSpacing: -0.3,
  },
  navDesktopDivider: {
    height: 1, background: '#2a2f3e', margin: '4px 4px 12px',
  },
  navDesktopBtn: {
    position: 'relative',
    background: 'none', border: '1px solid transparent',
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', borderRadius: 12,
    cursor: 'pointer', transition: 'all 0.2s ease',
    textAlign: 'left',
  },
  navDesktopBtnAtivo: {
    background: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.15)',
  },
  navDesktopActivePill: {
    position: 'absolute', left: 0, top: '50%',
    transform: 'translateY(-50%)',
    width: 3, height: 18, borderRadius: 99,
    background: 'linear-gradient(to bottom, #10b981, #14b8a6)',
  },
  navDesktopLabel: {
    fontSize: 14, fontWeight: 600,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'color 0.2s ease',
  },
}

const css = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #0f1419; }
  nav::-webkit-scrollbar { display: none; }

  @media (min-width: 768px) {
    #app-nav-mobile { display: none !important; }
    #app-nav-desktop { display: flex !important; }
    #app-content { margin-left: 220px; padding-bottom: 0 !important; }
  }
`
