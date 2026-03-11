import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const TIPOS = [
  { key: "receita",          label: "Receitas",           cor: "#22c55e", bg: "#052e16" },
  { key: "despesa_fixa",     label: "Despesas Fixas",     cor: "#f97316", bg: "#1c0a00" },
  { key: "despesa_variavel", label: "Despesas Variáveis", cor: "#3b82f6", bg: "#0c1a2e" },
];

function fmtBRL(v) {
  return (parseFloat(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(realizado, planejado) {
  if (!planejado || planejado === 0) return realizado > 0 ? 100 : 0;
  return Math.min(Math.round((realizado / planejado) * 100), 999);
}

function BarraProgresso({ valor, max, cor }) {
  const p = max > 0 ? Math.min((valor / max) * 100, 100) : 0;
  const acima = valor > max && max > 0;
  return (
    <div style={s.barraFundo}>
      <div style={{
        ...s.barraPreenchida,
        width: `${p}%`,
        background: acima ? "#ef4444" : cor,
        boxShadow: acima ? "0 0 8px #ef444466" : `0 0 8px ${cor}44`,
      }} />
    </div>
  );
}

function CardSaldo({ label, valor, sub, destaque }) {
  const positivo = parseFloat(valor) >= 0;
  return (
    <div style={{ ...s.cardSaldo, borderColor: destaque ? (positivo ? "#22c55e" : "#ef4444") : "#1e293b" }}>
      <span style={s.cardSaldoLabel}>{label}</span>
      <span style={{
        ...s.cardSaldoValor,
        color: destaque ? (positivo ? "#22c55e" : "#ef4444") : "#e2e8f0",
        fontSize: destaque ? 20 : 16,
      }}>
        {fmtBRL(valor)}
      </span>
      {sub && <span style={s.cardSaldoSub}>{sub}</span>}
    </div>
  );
}

function SecaoTipo({ tipo, itens }) {
  const totalPlan = itens.reduce((s, i) => s + parseFloat(i.planejado), 0);
  const totalReal = itens.reduce((s, i) => s + parseFloat(i.realizado), 0);
  const acima = totalReal > totalPlan && tipo.key !== "receita";

  return (
    <div style={s.secao}>
      {/* Cabeçalho da seção */}
      <div style={{ ...s.secaoHeader, borderLeftColor: tipo.cor }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ ...s.tipoTag, background: tipo.bg, color: tipo.cor }}>{tipo.label}</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 2 }}>
            {fmtBRL(totalReal)} <span style={{ color: "#334155" }}>/ {fmtBRL(totalPlan)}</span>
          </div>
          <div style={{ fontSize: 11, color: acima ? "#ef4444" : "#475569" }}>
            {pct(totalReal, totalPlan)}% do planejado
          </div>
        </div>
      </div>

      {/* Itens */}
      {itens.map(item => {
        const p = parseFloat(item.planejado);
        const r = parseFloat(item.realizado);
        const acimaItem = r > p && p > 0 && tipo.key !== "receita";
        return (
          <div key={item.categoria} style={s.item}>
            <div style={s.itemTopo}>
              <span style={s.itemNome}>{item.categoria}</span>
              <div style={s.itemValores}>
                <span style={{ color: acimaItem ? "#ef4444" : "#e2e8f0", fontWeight: 600 }}>
                  {fmtBRL(r)}
                </span>
                <span style={{ color: "#334155" }}>/ {fmtBRL(p)}</span>
              </div>
            </div>
            <BarraProgresso valor={r} max={p} cor={tipo.cor} />
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const hoje = new Date();
  const [mes, setMes]       = useState(hoje.getMonth() + 1);
  const [ano, setAno]       = useState(hoje.getFullYear());
  const [resumo, setResumo] = useState([]);
  const [saldo, setSaldo]   = useState(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/dashboard/resumo-mensal?mes=${mes}&ano=${ano}`).then(r => r.json()),
      fetch(`${API_URL}/dashboard/saldo-mensal?mes=${mes}&ano=${ano}`).then(r => r.json()),
    ]).then(([res, sal]) => {
      setResumo(res);
      setSaldo(sal);
    }).finally(() => setLoading(false));
  }, [mes, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  const itensPorTipo = (tipo) => resumo.filter(r => r.tipo === tipo);

  const mesAnterior = () => {
    if (mes === 1) { setMes(12); setAno(a => a - 1); }
    else setMes(m => m - 1);
  };
  const mesProximo = () => {
    if (mes === 12) { setMes(1); setAno(a => a + 1); }
    else setMes(m => m + 1);
  };

  return (
    <div style={s.page}>
      <style>{css}</style>

      {/* Topbar */}
      <div style={s.topbar}>
        <div>
          <div style={s.topbarTitle}>Dashboard</div>
          <div style={s.topbarSub}>Finança Familiar</div>
        </div>
        <div style={s.mesSelector}>
          <button style={s.navBtn} onClick={mesAnterior}>‹</button>
          <span style={s.mesLabel}>{MESES[mes - 1]} {ano}</span>
          <button style={s.navBtn} onClick={mesProximo}>›</button>
        </div>
      </div>

      {loading ? (
        <div style={s.loadingWrap}>
          <div style={s.spinner} />
          <span style={{ color: "#475569", marginTop: 12 }}>Carregando...</span>
        </div>
      ) : (
        <div style={s.body}>

          {/* Cards de saldo */}
          {saldo && (
            <div style={s.saldoGrid}>
              <CardSaldo label="Receitas Realizadas"  valor={saldo.total_receitas}      sub={`Planejado: ${fmtBRL(saldo.total_receitas_plan)}`} />
              <CardSaldo label="Despesas Realizadas"  valor={saldo.total_despesas}      sub={`Planejado: ${fmtBRL(saldo.total_despesas_plan)}`} />
              <CardSaldo label="Saldo do Mês"         valor={saldo.saldo_realizado}     sub={`Planejado: ${fmtBRL(saldo.saldo_planejado)}`} destaque />
            </div>
          )}

          {/* Sem dados */}
          {resumo.length === 0 && (
            <div style={s.vazio}>
              <span style={{ fontSize: 40 }}>📊</span>
              <span style={{ color: "#475569", marginTop: 12 }}>
                Nenhum dado para {MESES[mes - 1]}/{ano}.<br />
                Adicione lançamentos ou defina o planejamento.
              </span>
            </div>
          )}

          {/* Seções por tipo */}
          {TIPOS.map(tipo => {
            const itens = itensPorTipo(tipo.key);
            if (!itens.length) return null;
            return <SecaoTipo key={tipo.key} tipo={tipo} itens={itens} />;
          })}

        </div>
      )}
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#080f1a",
    fontFamily: "'Syne', sans-serif",
    color: "#e2e8f0",
    paddingBottom: 80,
  },
  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "24px 24px",
    borderBottom: "1px solid #1e293b",
    position: "sticky", top: 0, zIndex: 10,
    background: "#080f1acc",
    backdropFilter: "blur(12px)",
    flexWrap: "wrap", gap: 16,
  },
  topbarTitle: { fontSize: 22, fontWeight: 800, letterSpacing: -0.5 },
  topbarSub:   { fontSize: 12, color: "#475569", marginTop: 2, letterSpacing: 1, textTransform: "uppercase" },
  mesSelector: {
    display: "flex", alignItems: "center", gap: 4,
    background: "#0f172a", borderRadius: 10,
    border: "1px solid #1e293b", padding: "4px 8px",
  },
  mesLabel: { fontSize: 14, fontWeight: 700, minWidth: 160, textAlign: "center", color: "#cbd5e1" },
  navBtn: {
    background: "none", border: "none", color: "#475569",
    fontSize: 20, cursor: "pointer", padding: "0 8px", lineHeight: 1,
    borderRadius: 6,
  },
  loadingWrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: 80,
  },
  spinner: {
    width: 32, height: 32, borderRadius: "50%",
    border: "3px solid #1e293b", borderTopColor: "#3b82f6",
    animation: "spin 0.8s linear infinite",
  },
  body: {
    display: "flex", flexDirection: "column", gap: 24,
    padding: "24px",
    maxWidth: 900, margin: "0 auto",
  },
  saldoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 16,
  },
  cardSaldo: {
    background: "#0f172a", border: "1px solid",
    borderRadius: 16, padding: "16px 18px",
    display: "flex", flexDirection: "column", gap: 4,
  },
  cardSaldoLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#475569" },
  cardSaldoValor: { fontWeight: 800, letterSpacing: -0.5, marginTop: 4 },
  cardSaldoSub:   { fontSize: 12, color: "#334155", marginTop: 2 },
  secao: {
    background: "#0a1628", border: "1px solid #1e293b",
    borderRadius: 16, overflow: "hidden",
  },
  secaoHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 20px", background: "#0f172a",
    borderBottom: "1px solid #1e293b",
    borderLeft: "3px solid",
  },
  tipoTag: {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: 1, padding: "4px 10px", borderRadius: 6,
  },
  item: {
    padding: "12px 20px",
    borderBottom: "1px solid #0f172a",
    display: "flex", flexDirection: "column", gap: 8,
  },
  itemTopo: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  itemNome: { fontSize: 14, color: "#94a3b8", fontWeight: 500 },
  itemValores: { display: "flex", alignItems: "baseline", gap: 6, fontSize: 13 },
  barraFundo: {
    width: "100%", height: 4, background: "#1e293b",
    borderRadius: 99, overflow: "hidden",
  },
  barraPreenchida: {
    height: "100%", borderRadius: 99,
    transition: "width 0.5s ease",
  },
  vazio: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: 60, textAlign: "center", lineHeight: 1.8,
  },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080f1a; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
