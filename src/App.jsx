import { useEffect, useState } from 'react'
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
  { key: 'dashboard',          label: 'Dashboard',    icon: 'D' },
  { key: 'lancar',             label: 'Lancar',       icon: '+' },
  { key: 'cartao',             label: 'Cartao',       icon: '$' },
  { key: 'extrato',            label: 'Extrato',      icon: 'X' },
  { key: 'despesas-variaveis', label: 'Variaveis',    icon: '%' },
  { key: 'emprestimos',        label: 'Emprestimos',  icon: 'E' },
  { key: 'recorrencias',       label: 'Recorrencias', icon: 'R' },
  { key: 'planejamento',       label: 'Planejamento', icon: 'P' },
  { key: 'cadastros',          label: 'Cadastros',    icon: '*' },
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
      .replaceAll('Ã‚Âº', 'º')
      .replaceAll('Ã‚Âª', 'ª')
      .replaceAll('Ã¢â‚¬â€', '-')
      .replaceAll('Ã¢â‚¬Â¹', '<')
      .replaceAll('Ã¢â‚¬Âº', '>')
      .replaceAll('Ã¢â€ Â©', '<-')
      .replaceAll('Ã¢â€ â€™', '->')
      .replaceAll('Ã¢Å“â€œ', 'OK')
      .replaceAll('Ã¢Å“â€¢', 'x')
      .replaceAll('Ã¢Å“ÂÃ¯Â¸Â', 'Editar')
      .replaceAll('Ã°Å¸â€™Â³', '')
      .replaceAll('Ã°Å¸â€œÅ ', '')
      .replaceAll('Ã°Å¸â€œË†', '')
      .replaceAll('Ã°Å¸ÂÂ¦', '')
      .replaceAll('Ã°Å¸â€œâ€¦', '')
      .replaceAll('Ã°Å¸Å¡Â«', 'Inativar')
      .replaceAll('Ã°Å¸â€Â´', '')
      .replaceAll('Ã°Å¸Å¸Â¡', '')
      .replaceAll('Ã°Å¸Å¸Â¢', '')
      .replaceAll('Ã¢Å¡Â¡', '')
      .replaceAll('Ã¢Å¡Â ', '')

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

      <div style={s.content}>
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

      <nav style={s.navDesktop}>
        <div style={s.navDesktopLogo}>PF</div>
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
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
  },
  navBtn: {
    flex: '0 0 auto', minWidth: 72, background: 'none', border: 'none',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 3,
    cursor: 'pointer', color: '#7c90a8', transition: 'color 0.15s',
    padding: '0 8px',
  },
  navBtnAtivo: { color: '#7c3aed' },
  navIcon:     { fontSize: 17, lineHeight: 1, fontWeight: 900 },
  navLabel:    { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },

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
    cursor: 'pointer', color: '#7c90a8', transition: 'all 0.15s',
    textAlign: 'left',
  },
  navDesktopBtnAtivo: { background: '#130a2a', color: '#a78bfa' },
  navDesktopLabel: { fontSize: 14, fontWeight: 600, fontFamily: "'Syne', sans-serif" },
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&display=swap');
  nav::-webkit-scrollbar { display: none; }
  @media (min-width: 768px) {
    body > div > nav:nth-child(3) { display: none !important; }
    body > div > nav:nth-child(2) { display: flex !important; }
    body > div > div:first-child  { margin-left: 200px; padding-bottom: 0 !important; }
  }
`
