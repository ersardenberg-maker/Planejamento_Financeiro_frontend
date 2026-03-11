import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function fmtBRL(v) {
  return (parseFloat(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatusIcon({ pct }) {
  if (pct >= 100) return <span title="Estourado">🔴</span>;
  if (pct >= 80)  return <span title="Atenção">🟡</span>;
  return               <span title="OK">🟢</span>;
}

function CartaoCategoria({ item }) {
  const planejado  = parseFloat(item.planejado) || 0;
  const realizado  = parseFloat(item.realizado) || 0;
  const percentual = planejado > 0 ? Math.min((realizado / planejado) * 100, 100) : realizado > 0 ? 100 : 0;
  const estouro    = realizado > planejado && planejado > 0;
  const restante   = planejado - realizado;

  const corBarra = estouro ? "#ef4444" : percentual >= 80 ? "#f59e0b" : "#3b82f6";

  return (
    <div style={s.cartao} className="cartao-item">
      <div style={s.cartaoTopo}>
        <div style={s.cartaoNome}>
          <StatusIcon pct={percentual} />
          <span>{item.categoria}</span>
        </div>
        <div style={s.cartaoPct} data-estouro={estouro}>
          {Math.round(percentual)}%
        </div>
      </div>

      {/* Barra de progresso */}
      <div style={s.barraFundo}>
        <div style={{
          ...s.barraPreenchida,
          width: `${percentual}%`,
          background: corBarra,
          boxShadow: `0 0 10px ${corBarra}66`,
        }} />
      </div>

      {/* Valores */}
      <div style={s.cartaoRodape}>
        <div style={s.cartaoValorBloco}>
          <span style={s.cartaoValorLabel}>Realizado</span>
          <span style={{ ...s.cartaoValor, color: estouro ? "#ef4444" : "#e2e8f0" }}>
            {fmtBRL(realizado)}
          </span>
        </div>
        <div style={{ ...s.cartaoValorBloco, textAlign: "center" }}>
          <span style={s.cartaoValorLabel}>Planejado</span>
          <span style={s.cartaoValor}>{fmtBRL(planejado)}</span>
        </div>
        <div style={{ ...s.cartaoValorBloco, textAlign: "right" }}>
          <span style={s.cartaoValorLabel}>{estouro ? "Estouro" : "Disponível"}</span>
          <span style={{ ...s.cartaoValor, color: estouro ? "#ef4444" : "#22c55e" }}>
            {fmtBRL(Math.abs(restante))}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DespesasVariaveis() {
  const hoje = new Date();
  const [mes, setMes]     = useState(hoje.getMonth() + 1);
  const [ano, setAno]     = useState(hoje.getFullYear());
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(() => {
    setLoading(true);
    fetch(`${API_URL}/dashboard/resumo-mensal?mes=${mes}&ano=${ano}`)
      .then(r => r.json())
      .then(data => setItens(data.filter(d => d.tipo === "despesa_variavel")))
      .finally(() => setLoading(false));
  }, [mes, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  const totalPlan = itens.reduce((s, i) => s + (parseFloat(i.planejado) || 0), 0);
  const totalReal = itens.reduce((s, i) => s + (parseFloat(i.realizado) || 0), 0);
  const totalPct  = totalPlan > 0 ? Math.round((totalReal / totalPlan) * 100) : 0;
  const estouroTotal = totalReal > totalPlan && totalPlan > 0;

  const qtdEstouro = itens.filter(i => parseFloat(i.realizado) > parseFloat(i.planejado) && parseFloat(i.planejado) > 0).length;
  const qtdAtencao = itens.filter(i => {
    const p = parseFloat(i.planejado); const r = parseFloat(i.realizado);
    return p > 0 && r <= p && (r / p) >= 0.8;
  }).length;

  const mesAnterior = () => { if (mes === 1) { setMes(12); setAno(a => a-1); } else setMes(m => m-1); };
  const mesProximo  = () => { if (mes === 12) { setMes(1); setAno(a => a+1); } else setMes(m => m+1); };

  return (
    <div style={s.page}>
      <style>{css}</style>

      {/* Topbar */}
      <div style={s.topbar}>
        <div>
          <div style={s.topbarTitle}>Despesas Variáveis</div>
          <div style={s.topbarSub}>Previsto vs Realizado</div>
        </div>
        <div style={s.mesSelector}>
          <button style={s.navBtn} onClick={mesAnterior}>‹</button>
          <span style={s.mesLabel}>{MESES[mes-1]} {ano}</span>
          <button style={s.navBtn} onClick={mesProximo}>›</button>
        </div>
      </div>

      {loading ? (
        <div style={s.loadingWrap}>
          <div style={s.spinner} />
        </div>
      ) : (
        <div style={s.body}>

          {/* Resumo geral */}
          <div style={s.resumo}>
            <div style={s.resumoEsquerda}>
              <div style={s.resumoValorGrande}>
                <span style={{ color: estouroTotal ? "#ef4444" : "#3b82f6" }}>{fmtBRL(totalReal)}</span>
                <span style={s.resumoSep}>/</span>
                <span style={s.resumoPlan}>{fmtBRL(totalPlan)}</span>
              </div>
              <div style={s.resumoLegenda}>total realizado / planejado</div>
              {/* Barra geral */}
              <div style={{ ...s.barraFundo, marginTop: 12, height: 6 }}>
                <div style={{
                  ...s.barraPreenchida,
                  width: `${Math.min(totalPct, 100)}%`,
                  background: estouroTotal ? "#ef4444" : totalPct >= 80 ? "#f59e0b" : "#3b82f6",
                  boxShadow: "none",
                }} />
              </div>
            </div>
            <div style={s.resumoDireita}>
              {qtdEstouro > 0 && (
                <div style={s.badge} data-tipo="estouro">
                  🔴 {qtdEstouro} {qtdEstouro === 1 ? "categoria estourada" : "categorias estouradas"}
                </div>
              )}
              {qtdAtencao > 0 && (
                <div style={s.badge} data-tipo="atencao">
                  🟡 {qtdAtencao} {qtdAtencao === 1 ? "categoria em atenção" : "categorias em atenção"}
                </div>
              )}
              {qtdEstouro === 0 && qtdAtencao === 0 && (
                <div style={s.badge} data-tipo="ok">
                  🟢 Tudo dentro do planejado
                </div>
              )}
            </div>
          </div>

          {/* Sem dados */}
          {itens.length === 0 && (
            <div style={s.vazio}>
              <span style={{ fontSize: 40 }}>📋</span>
              <span style={{ color: "#475569", marginTop: 12 }}>
                Nenhum dado para {MESES[mes-1]}/{ano}.<br/>
                Defina o planejamento ou adicione lançamentos.
              </span>
            </div>
          )}

          {/* Grid de cartões */}
          <div style={s.grid}>
            {itens
              .sort((a, b) => {
                // Estourados primeiro, depois por % de uso
                const pa = parseFloat(a.planejado); const ra = parseFloat(a.realizado);
                const pb = parseFloat(b.planejado); const rb = parseFloat(b.realizado);
                const pctA = pa > 0 ? ra / pa : 0;
                const pctB = pb > 0 ? rb / pb : 0;
                return pctB - pctA;
              })
              .map(item => (
                <CartaoCategoria key={item.categoria} item={item} />
              ))
            }
          </div>

        </div>
      )}
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#080f1a",
    fontFamily: "'DM Sans', sans-serif",
    color: "#e2e8f0",
    paddingBottom: 80,
  },
  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 20px",
    borderBottom: "1px solid #1e293b",
    position: "sticky", top: 0, zIndex: 10,
    background: "#080f1acc", backdropFilter: "blur(12px)",
    flexWrap: "wrap", gap: 12,
  },
  topbarTitle: { fontSize: 20, fontWeight: 800, letterSpacing: -0.5 },
  topbarSub:   { fontSize: 11, color: "#475569", marginTop: 2, letterSpacing: 1, textTransform: "uppercase" },
  mesSelector: {
    display: "flex", alignItems: "center", gap: 4,
    background: "#0f172a", borderRadius: 10,
    border: "1px solid #1e293b", padding: "4px 8px",
  },
  mesLabel: { fontSize: 13, fontWeight: 700, minWidth: 140, textAlign: "center", color: "#cbd5e1" },
  navBtn: {
    background: "none", border: "none", color: "#475569",
    fontSize: 20, cursor: "pointer", padding: "0 8px", lineHeight: 1, borderRadius: 6,
  },
  loadingWrap: {
    display: "flex", alignItems: "center", justifyContent: "center", padding: 80,
  },
  spinner: {
    width: 32, height: 32, borderRadius: "50%",
    border: "3px solid #1e293b", borderTopColor: "#3b82f6",
    animation: "spin 0.8s linear infinite",
  },
  body: {
    display: "flex", flexDirection: "column", gap: 20,
    padding: "20px",
    maxWidth: 960, margin: "0 auto",
  },
  resumo: {
    background: "#0f172a", border: "1px solid #1e293b",
    borderRadius: 16, padding: "20px 24px",
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", gap: 16, flexWrap: "wrap",
  },
  resumoEsquerda: { flex: "1 1 240px" },
  resumoDireita:  { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" },
  resumoValorGrande: {
    display: "flex", alignItems: "baseline", gap: 8,
    fontSize: 26, fontWeight: 800, letterSpacing: -0.5,
    flexWrap: "wrap",
  },
  resumoSep:    { color: "#334155", fontWeight: 400 },
  resumoPlan:   { color: "#475569", fontSize: 18 },
  resumoLegenda: { fontSize: 11, color: "#475569", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.8 },
  badge: {
    fontSize: 12, fontWeight: 600, padding: "6px 12px",
    borderRadius: 20, background: "#0a1628", border: "1px solid #1e293b",
    color: "#94a3b8",
  },
  vazio: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: 60, textAlign: "center", lineHeight: 1.8,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },
  cartao: {
    background: "#0a1628", border: "1px solid #1e293b",
    borderRadius: 14, padding: "16px",
    display: "flex", flexDirection: "column", gap: 12,
    transition: "border-color 0.2s",
  },
  cartaoTopo: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  cartaoNome: {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 14, fontWeight: 700, color: "#cbd5e1",
  },
  cartaoPct: {
    fontSize: 13, fontWeight: 800, color: "#3b82f6",
    background: "#0c1a2e", padding: "2px 10px", borderRadius: 20,
  },
  barraFundo: {
    width: "100%", height: 8, background: "#1e293b",
    borderRadius: 99, overflow: "hidden",
  },
  barraPreenchida: {
    height: "100%", borderRadius: 99,
    transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
  },
  cartaoRodape: {
    display: "flex", justifyContent: "space-between",
  },
  cartaoValorBloco: {
    display: "flex", flexDirection: "column", gap: 2,
  },
  cartaoValorLabel: { fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 0.8 },
  cartaoValor:      { fontSize: 13, fontWeight: 700, color: "#94a3b8" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080f1a; }
  .cartao-item:hover { border-color: #334155 !important; }
  [data-estouro="true"] { color: #ef4444 !important; }
  [data-tipo="estouro"] { border-color: #7f1d1d !important; color: #fca5a5 !important; }
  [data-tipo="atencao"] { border-color: #78350f !important; color: #fcd34d !important; }
  [data-tipo="ok"]      { border-color: #14532d !important; color: #86efac !important; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
