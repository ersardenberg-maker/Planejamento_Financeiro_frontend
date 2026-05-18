import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Clock,
  CalendarDays,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const MESES = [
  "Janeiro","Fevereiro","Marco","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const TIPOS = [
  { key: "receita",          label: "Receitas",           cor: "#10b981", bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.18)" },
  { key: "despesa_fixa",     label: "Despesas Fixas",     cor: "#f97316", bg: "rgba(249,115,22,0.06)",  border: "rgba(249,115,22,0.18)" },
  { key: "despesa_variavel", label: "Despesas Variaveis", cor: "#3b82f6", bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.18)" },
];

function fmtBRL(v) {
  return (parseFloat(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(realizado, planejado) {
  if (!planejado || planejado === 0) return realizado > 0 ? 100 : 0;
  return Math.min(Math.round((realizado / planejado) * 100), 999);
}

function BarraProgresso({ valor, max, cor, acima }) {
  const p = max > 0 ? Math.min((valor / max) * 100, 100) : 0;
  return (
    <div style={s.barraFundo}>
      <div
        style={{
          ...s.barraPreenchida,
          width: p + "%",
          background: acima
            ? "linear-gradient(to right, #ef4444, #f87171)"
            : "linear-gradient(to right, " + cor + ", " + cor + "bb)",
          boxShadow: acima
            ? "0 0 8px rgba(239,68,68,0.4)"
            : "0 0 8px " + cor + "44",
        }}
      />
    </div>
  );
}

function CardSaldo({ label, valor, sub, destaque, Icon, iconColor }) {
  const positivo = parseFloat(valor) >= 0;

  return (
    <div
      style={{
        ...s.cardSaldo,
        ...(destaque ? s.cardSaldoDestaque : {}),
        borderColor: destaque
          ? positivo ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"
          : "#2a2f3e",
      }}
    >
      <div style={s.cardSaldoTop}>
        <span style={s.cardSaldoLabel}>{label}</span>
        {Icon && (
          <div style={{ ...s.cardSaldoIconWrap, background: iconColor + "18" }}>
            <Icon size={14} color={iconColor} strokeWidth={2} />
          </div>
        )}
      </div>
      <span
        style={{
          ...s.cardSaldoValor,
          fontSize: destaque ? 22 : 18,
          ...(destaque ? {
            background: positivo
              ? "linear-gradient(to right, #10b981, #34d399)"
              : "linear-gradient(to right, #ef4444, #f87171)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          } : { color: "#e2e8f0" }),
        }}
      >
        {fmtBRL(valor)}
      </span>
      {sub && <span style={s.cardSaldoSub}>{sub}</span>}
    </div>
  );
}

function SecaoTipo({ tipo, itens }) {
  const totalPlan = itens.reduce(function(acc, i) { return acc + parseFloat(i.planejado); }, 0);
  const totalReal = itens.reduce(function(acc, i) { return acc + parseFloat(i.realizado); }, 0);
  const acima = totalReal > totalPlan && tipo.key !== "receita";
  const porcentagem = pct(totalReal, totalPlan);

  return (
    <div style={{ ...s.secao, borderColor: tipo.border }}>
      <div style={{ ...s.secaoHeader, background: tipo.bg, borderBottomColor: tipo.border }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ ...s.secaoBarLateral, background: tipo.cor }} />
          <span style={{ ...s.tipoTag, color: tipo.cor }}>{tipo.label}</span>
        </div>
        <div style={s.secaoHeaderRight}>
          <div style={s.secaoValores}>
            <span style={{ color: acima ? "#ef4444" : "#e2e8f0", fontWeight: 700, fontSize: 14 }}>
              {fmtBRL(totalReal)}
            </span>
            <span style={{ color: "#6b7280", fontSize: 13 }}>/ {fmtBRL(totalPlan)}</span>
          </div>
          <div style={{ ...s.secaoPct, color: acima ? "#ef4444" : porcentagem >= 80 ? "#facc15" : "#6b7280" }}>
            {porcentagem}% do planejado
          </div>
        </div>
      </div>

      <div>
        {itens.map(function(item) {
          var p = parseFloat(item.planejado);
          var r = parseFloat(item.realizado);
          var acimaItem = r > p && p > 0 && tipo.key !== "receita";
          var pctItem = pct(r, p);
          return (
            <div key={item.categoria} style={s.item}>
              <div style={s.itemTopo}>
                <span style={s.itemNome}>{item.categoria}</span>
                <div style={s.itemValores}>
                  <span style={{ color: acimaItem ? "#ef4444" : "#e2e8f0", fontWeight: 700, fontSize: 13 }}>
                    {fmtBRL(r)}
                  </span>
                  <span style={{ color: "#6b7280", fontSize: 12 }}>/ {fmtBRL(p)}</span>
                  <span
                    style={{
                      ...s.itemBadge,
                      color: acimaItem ? "#ef4444" : pctItem >= 80 ? "#facc15" : "#6b7280",
                      background: acimaItem
                        ? "rgba(239,68,68,0.1)"
                        : pctItem >= 80 ? "rgba(250,204,21,0.1)" : "#0f1419",
                    }}
                  >
                    {pctItem}%
                  </span>
                </div>
              </div>
              <BarraProgresso valor={r} max={p} cor={tipo.cor} acima={acimaItem} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  var hoje = new Date();
  var [mes, setMes]         = useState(hoje.getMonth() + 1);
  var [ano, setAno]         = useState(hoje.getFullYear());
  var [resumo, setResumo]   = useState([]);
  var [saldo, setSaldo]     = useState(null);
  var [loading, setLoading] = useState(true);

  var carregar = useCallback(function() {
    setLoading(true);
    Promise.all([
      fetch(API_URL + "/dashboard/resumo-mensal?mes=" + mes + "&ano=" + ano).then(function(r) { return r.json(); }),
      fetch(API_URL + "/dashboard/saldo-mensal?mes=" + mes + "&ano=" + ano).then(function(r) { return r.json(); }),
    ]).then(function(results) {
      setResumo(results[0]);
      setSaldo(results[1]);
    }).finally(function() { setLoading(false); });
  }, [mes, ano]);

  useEffect(function() { carregar(); }, [carregar]);

  function itensPorTipo(tipo) { return resumo.filter(function(r) { return r.tipo === tipo; }); }

  var variaveis    = itensPorTipo("despesa_variavel");
  var totalVariavelPlan = variaveis.reduce(function(acc, i) { return acc + parseFloat(i.planejado || 0); }, 0);
  var totalVariavelReal = variaveis.reduce(function(acc, i) { return acc + parseFloat(i.realizado || 0); }, 0);
  var restanteVariavel  = totalVariavelPlan - totalVariavelReal;

  var hojeMesAtual  = hoje.getMonth() + 1 === mes && hoje.getFullYear() === ano;
  var ultimoDiaMes  = new Date(ano, mes, 0).getDate();
  var diasRestantes = hojeMesAtual ? Math.max(ultimoDiaMes - hoje.getDate() + 1, 1) : ultimoDiaMes;
  var limiteDiario  = restanteVariavel > 0 ? restanteVariavel / diasRestantes : 0;

  var categoriasEstouradas = resumo.filter(function(i) {
    return i.tipo !== "receita" && parseFloat(i.realizado) > parseFloat(i.planejado) && parseFloat(i.planejado) > 0;
  });
  var categoriasAtencao = resumo.filter(function(i) {
    var p = parseFloat(i.planejado);
    var r = parseFloat(i.realizado);
    return i.tipo !== "receita" && p > 0 && r <= p && r / p >= 0.8;
  });

  function mesAnterior() {
    if (mes === 1) { setMes(12); setAno(function(a) { return a - 1; }); }
    else setMes(function(m) { return m - 1; });
  }
  function mesProximo() {
    if (mes === 12) { setMes(1); setAno(function(a) { return a + 1; }); }
    else setMes(function(m) { return m + 1; });
  }

  return (
    <div style={s.page}>
      <style>{css}</style>

      <div style={s.topbar}>
        <div style={s.topbarLeft}>
          <div style={s.topbarIconWrap}>
            <Wallet size={18} color="#10b981" strokeWidth={2} />
          </div>
          <div>
            <div style={s.topbarTitle}>Dashboard</div>
            <div style={s.topbarSub}>Financa Familiar</div>
          </div>
        </div>

        <div style={s.mesSelector}>
          <button style={s.mesBtnNav} onClick={mesAnterior}>
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <span style={s.mesLabel}>{MESES[mes - 1]} {ano}</span>
          <button style={s.mesBtnNav} onClick={mesProximo}>
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={s.loadingWrap}>
          <div style={s.spinner} />
          <span style={{ color: "#6b7280", marginTop: 14, fontSize: 14 }}>Carregando...</span>
        </div>
      ) : (
        <div style={s.body}>

          {saldo && (
            <div style={s.saldoGrid}>
              <CardSaldo
                label="Receitas Realizadas"
                valor={saldo.total_receitas}
                sub={"Planejado: " + fmtBRL(saldo.total_receitas_plan)}
                Icon={TrendingUp}
                iconColor="#10b981"
              />
              <CardSaldo
                label="Despesas Realizadas"
                valor={saldo.total_despesas}
                sub={"Planejado: " + fmtBRL(saldo.total_despesas_plan)}
                Icon={TrendingDown}
                iconColor="#f97316"
              />
              <CardSaldo
                label="Saldo do Mes"
                valor={saldo.saldo_realizado}
                sub={"Planejado: " + fmtBRL(saldo.saldo_planejado)}
                destaque
                Icon={Wallet}
                iconColor={parseFloat(saldo.saldo_realizado) >= 0 ? "#10b981" : "#ef4444"}
              />
            </div>
          )}

          {resumo.length > 0 && (
            <div style={s.insightsGrid}>
              <div style={s.insightCard}>
                <div style={s.insightTop}>
                  <CalendarDays size={14} color="#6b7280" strokeWidth={2} />
                  <span style={s.insightLabel}>Variavel restante</span>
                </div>
                <strong style={{ ...s.insightValor, color: restanteVariavel >= 0 ? "#10b981" : "#ef4444" }}>
                  {fmtBRL(restanteVariavel)}
                </strong>
              </div>

              <div style={s.insightCard}>
                <div style={s.insightTop}>
                  <Clock size={14} color="#6b7280" strokeWidth={2} />
                  <span style={s.insightLabel}>Limite por dia</span>
                </div>
                <strong style={{ ...s.insightValor, color: "#e2e8f0" }}>
                  {fmtBRL(limiteDiario)}
                </strong>
                <span style={s.insightSub}>{diasRestantes} dia(s) no periodo</span>
              </div>

              <div style={s.insightCard}>
                <div style={s.insightTop}>
                  <AlertTriangle size={14} color={categoriasEstouradas.length > 0 ? "#ef4444" : "#6b7280"} strokeWidth={2} />
                  <span style={s.insightLabel}>Alertas</span>
                </div>
                <strong style={{ ...s.insightValor, color: categoriasEstouradas.length > 0 ? "#ef4444" : "#e2e8f0" }}>
                  {categoriasEstouradas.length} estouro(s)
                </strong>
                <span style={s.insightSub}>{categoriasAtencao.length} em atencao</span>
              </div>
            </div>
          )}

          {resumo.length === 0 && (
            <div style={s.vazio}>
              <div style={s.vazioIcon}>
                <Wallet size={32} color="#4b5563" strokeWidth={1.5} />
              </div>
              <span style={{ color: "#6b7280", marginTop: 16, fontSize: 15, fontWeight: 500 }}>
                Nenhum dado para {MESES[mes - 1]}/{ano}.
              </span>
              <span style={{ color: "#4b5563", marginTop: 6, fontSize: 13 }}>
                Adicione lancamentos ou defina o planejamento.
              </span>
            </div>
          )}

          {TIPOS.map(function(tipo) {
            var itens = itensPorTipo(tipo.key);
            if (!itens.length) return null;
            return <SecaoTipo key={tipo.key} tipo={tipo} itens={itens} />;
          })}

        </div>
      )}
    </div>
  );
}

var s = {
  page: {
    minHeight: "100vh",
    background: "#0f1419",
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    color: "#e2e8f0",
    paddingBottom: 80,
  },
  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #2a2f3e",
    position: "sticky", top: 0, zIndex: 10,
    background: "rgba(15,20,25,0.92)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    flexWrap: "wrap", gap: 12,
  },
  topbarLeft: { display: "flex", alignItems: "center", gap: 12 },
  topbarIconWrap: {
    background: "rgba(16,185,129,0.12)",
    borderRadius: 10, padding: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  topbarTitle: {
    fontSize: 18, fontWeight: 800, letterSpacing: -0.5,
    background: "linear-gradient(to right, #fff, #6ee7b7)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  topbarSub: {
    fontSize: 11, color: "#6b7280", marginTop: 1,
    letterSpacing: 1, textTransform: "uppercase", fontWeight: 600,
  },
  mesSelector: {
    display: "flex", alignItems: "center", gap: 4,
    background: "#1a1f2e", borderRadius: 12,
    border: "1px solid #2a2f3e", padding: "4px 6px",
  },
  mesLabel: {
    fontSize: 13, fontWeight: 700,
    minWidth: 150, textAlign: "center", color: "#d1d5db",
  },
  mesBtnNav: {
    background: "none", border: "none", color: "#6b7280",
    cursor: "pointer", padding: "4px 6px", lineHeight: 0,
    borderRadius: 8, display: "flex", alignItems: "center",
  },
  loadingWrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: 80,
  },
  spinner: {
    width: 36, height: 36, borderRadius: "50%",
    border: "3px solid #2a2f3e", borderTopColor: "#10b981",
    animation: "spin 0.8s linear infinite",
  },
  body: {
    display: "flex", flexDirection: "column", gap: 20,
    padding: "24px",
    maxWidth: 960, margin: "0 auto",
  },
  saldoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  cardSaldo: {
    background: "#1a1f2e",
    border: "1px solid",
    borderRadius: 20, padding: "18px 20px",
    display: "flex", flexDirection: "column", gap: 6,
    overflow: "hidden", minWidth: 0,
  },
  cardSaldoDestaque: {
    gridColumn: "1 / -1",
    background: "linear-gradient(135deg, #1a1f2e, #111a14)",
  },
  cardSaldoTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardSaldoLabel: {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: 0.8, color: "#6b7280",
  },
  cardSaldoIconWrap: {
    padding: 5, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  cardSaldoValor: {
    fontWeight: 800, letterSpacing: -0.5, marginTop: 2,
    wordBreak: "break-all", lineHeight: 1.2,
  },
  cardSaldoSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  insightsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
  },
  insightCard: {
    background: "#1a1f2e", border: "1px solid #2a2f3e",
    borderRadius: 16, padding: "16px 18px",
    display: "flex", flexDirection: "column", gap: 6,
  },
  insightTop: { display: "flex", alignItems: "center", gap: 6 },
  insightLabel: {
    fontSize: 11, color: "#6b7280", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  insightValor: { fontSize: 18, letterSpacing: -0.3 },
  insightSub:   { fontSize: 12, color: "#6b7280" },
  secao: {
    background: "#1a1f2e",
    border: "1px solid",
    borderRadius: 20, overflow: "hidden",
  },
  secaoHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 20px",
    borderBottom: "1px solid",
  },
  secaoBarLateral: {
    width: 3, height: 16, borderRadius: 99, flexShrink: 0,
  },
  tipoTag: {
    fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8,
  },
  secaoHeaderRight: { textAlign: "right", display: "flex", flexDirection: "column", gap: 2 },
  secaoValores: { display: "flex", alignItems: "baseline", gap: 6, justifyContent: "flex-end" },
  secaoPct: { fontSize: 11, fontWeight: 600 },
  item: {
    padding: "12px 20px",
    borderBottom: "1px solid #0f1419",
    display: "flex", flexDirection: "column", gap: 8,
  },
  itemTopo: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  itemNome: { fontSize: 13, color: "#d1d5db", fontWeight: 500, flexShrink: 0 },
  itemValores: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" },
  itemBadge: {
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
    padding: "2px 6px", borderRadius: 6,
  },
  barraFundo: {
    width: "100%", height: 4, background: "#2a2f3e",
    borderRadius: 99, overflow: "hidden",
  },
  barraPreenchida: {
    height: "100%", borderRadius: 99,
    transition: "width 0.5s ease",
  },
  vazio: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: 60, textAlign: "center",
  },
  vazioIcon: {
    background: "#1a1f2e", borderRadius: 20, padding: 20,
    border: "1px solid #2a2f3e",
  },
};

var css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f1419; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
