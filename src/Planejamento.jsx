import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const TIPOS = [
  { key: "receita",          label: "Receitas",           cor: "#10b981", bg: "rgba(16,185,129,0.06)" },
  { key: "despesa_fixa",     label: "Despesas Fixas",     cor: "#f97316", bg: "rgba(249,115,22,0.06)" },
  { key: "despesa_variavel", label: "Despesas Variáveis", cor: "#3b82f6", bg: "rgba(59,130,246,0.06)" },
];

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function fmtBRL(value) {
  const n = parseFloat(value) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseBRL(str) {
  if (!str) return "";
  return str.replace(/[R$\s.]/g, "").replace(",", ".");
}

function CelulaValor({ valor, onChange, saving }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");

  function iniciarEdicao() {
    setRaw(valor > 0 ? String(valor).replace(".", ",") : "");
    setEditing(true);
  }

  function confirmar() {
    const n = parseFloat(parseBRL(raw)) || 0;
    onChange(n);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        style={s.celulaInput}
        value={raw}
        onChange={e => setRaw(e.target.value)}
        onBlur={confirmar}
        onKeyDown={e => { if (e.key === "Enter") confirmar(); if (e.key === "Escape") setEditing(false); }}
        placeholder="0,00"
      />
    );
  }

  return (
    <span
      style={{ ...s.celulaValor, color: valor > 0 ? "#e2e8f0" : "#6b7280", cursor: saving ? "default" : "pointer" }}
      onClick={saving ? undefined : iniciarEdicao}
      title="Clique para editar"
    >
      {valor > 0 ? fmtBRL(valor) : "—"}
    </span>
  );
}

export default function Planejamento() {
  const hoje = new Date();
  const [mes, setMes]           = useState(hoje.getMonth() + 1);
  const [ano, setAno]           = useState(hoje.getFullYear());
  const [categorias, setCats]   = useState([]);
  const [plano, setPlano]       = useState({});
  const [parcelasEmprestimos, setParcelasEmprestimos] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [toast, setToast]       = useState(null);

  const showToast = (msg, tipo = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    fetch(`${API_URL}/categorias/?ativo=true`)
      .then(r => r.json())
      .then(setCats);
  }, []);

  const carregarPlano = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/planejamento/?mes=${mes}&ano=${ano}`).then(r => r.json()),
      fetch(`${API_URL}/emprestimos/parcelas?mes=${mes}&ano=${ano}`).then(r => r.json()),
    ]).then(([planoData, parcelasData]) => {
      const mapa = {};
      planoData.forEach(p => { mapa[p.categoria_id] = { id: p.id, valor: parseFloat(p.valor) }; });
      setPlano(mapa);
      setParcelasEmprestimos(parcelasData.filter(p => p.status !== "paga"));
    }).finally(() => setLoading(false));
  }, [mes, ano]);

  useEffect(() => { carregarPlano(); }, [carregarPlano]);

  function editarValor(categoria_id, novoValor) {
    setPlano(prev => ({
      ...prev,
      [categoria_id]: { ...prev[categoria_id], valor: novoValor, dirty: true },
    }));
  }

  async function salvarTudo() {
    setSaving(true);
    const dirty = Object.entries(plano).filter(([, v]) => v.dirty);
    try {
      await Promise.all(dirty.map(([categoria_id, entry]) =>
        fetch(`${API_URL}/planejamento/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoria_id, mes, ano, valor: entry.valor }),
        })
      ));
      showToast(`Planejamento de ${MESES[mes-1]} salvo!`);
      carregarPlano();
    } catch {
      showToast("Erro ao salvar.", "erro");
    } finally {
      setSaving(false);
    }
  }

  async function copiarMesAnterior() {
    const mesAnt = mes === 1 ? 12 : mes - 1;
    const anoAnt = mes === 1 ? ano - 1 : ano;
    setCopiando(true);
    try {
      const data = await fetch(`${API_URL}/planejamento/?mes=${mesAnt}&ano=${anoAnt}`).then(r => r.json());
      if (!data.length) { showToast(`Nenhum planejamento em ${MESES[mesAnt-1]}/${anoAnt}.`, "aviso"); return; }
      const novoPlano = { ...plano };
      data.forEach(p => {
        novoPlano[p.categoria_id] = { valor: parseFloat(p.valor), dirty: true };
      });
      setPlano(novoPlano);
      showToast(`Valores de ${MESES[mesAnt-1]} copiados! Salve para confirmar.`, "aviso");
    } catch {
      showToast("Erro ao copiar.", "erro");
    } finally {
      setCopiando(false);
    }
  }

  const temDirty = Object.values(plano).some(v => v.dirty);

  const totalPorTipo = (tipo) => {
    return categorias
      .filter(c => c.tipo === tipo)
      .reduce((sum, c) => sum + (plano[c.id]?.valor || 0), 0);
  };

  const totalEmprestimos = parcelasEmprestimos.reduce((s, p) => s + parseFloat(p.valor_previsto || 0), 0);
  const totalReceitas  = totalPorTipo("receita");
  const totalDespesas  = totalPorTipo("despesa_fixa") + totalPorTipo("despesa_variavel") + totalEmprestimos;
  const saldo          = totalReceitas - totalDespesas;

  return (
    <div style={s.page}>
      <style>{css}</style>

      {/* Cabeçalho */}
      <div style={s.topbar}>
        <div>
          <div style={s.topbarTitle}>
            <span className="title-gradient">Planejamento Mensal</span>
          </div>
          <div style={s.topbarSub}>Finança Familiar</div>
        </div>
        <div style={s.topbarControls}>
          <div style={s.mesSelector}>
            <button style={s.navBtn} onClick={() => {
              if (mes === 1) { setMes(12); setAno(a => a - 1); }
              else setMes(m => m - 1);
            }}>‹</button>
            <span style={s.mesLabel}>{MESES[mes-1]} {ano}</span>
            <button style={s.navBtn} onClick={() => {
              if (mes === 12) { setMes(1); setAno(a => a + 1); }
              else setMes(m => m + 1);
            }}>›</button>
          </div>

          <button style={s.btnCopiar} onClick={copiarMesAnterior} disabled={copiando || saving}>
            {copiando ? "Copiando..." : `↩ Copiar ${MESES[mes === 1 ? 11 : mes-2]}`}
          </button>

          {temDirty && (
            <button style={s.btnSalvar} onClick={salvarTudo} disabled={saving} className="btn-salvar">
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          )}
        </div>
      </div>

      {/* Cards de resumo */}
      <div style={s.resumoRow}>
        <div style={{ ...s.resumoCard, borderColor: "#10b981" }}>
          <span style={{ ...s.resumoLabel, color: "#10b981" }}>Receitas</span>
          <span style={s.resumoValor}>{fmtBRL(totalReceitas)}</span>
        </div>
        <div style={{ ...s.resumoCard, borderColor: "#ef4444" }}>
          <span style={{ ...s.resumoLabel, color: "#ef4444" }}>Despesas</span>
          <span style={s.resumoValor}>{fmtBRL(totalDespesas)}</span>
        </div>
        <div style={{ ...s.resumoCard, borderColor: saldo >= 0 ? "#10b981" : "#ef4444" }}>
          <span style={{ ...s.resumoLabel, color: saldo >= 0 ? "#10b981" : "#ef4444" }}>Saldo</span>
          <span style={{ ...s.resumoValor, color: saldo >= 0 ? "#10b981" : "#ef4444" }}>{fmtBRL(saldo)}</span>
        </div>
      </div>

      {/* Tabelas por tipo */}
      {loading ? (
        <div style={s.loadingWrap}>
          <div style={s.spinner} />
          <span style={{ color: "#9ca3af", marginTop: 12 }}>Carregando...</span>
        </div>
      ) : (
        <div style={s.tablesWrap}>
          {TIPOS.map(tipo => {
            const cats = categorias.filter(c => c.tipo === tipo.key);
            const total = totalPorTipo(tipo.key);
            return (
              <div key={tipo.key} style={s.tableCard}>
                <div style={{ ...s.tableHeader, background: tipo.bg, borderBottomColor: tipo.cor }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ ...s.tipoTag, color: tipo.cor }}>{tipo.label}</div>
                  </div>
                  <span style={{ color: tipo.cor, fontWeight: 700, fontSize: 15 }}>{fmtBRL(total)}</span>
                </div>

                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Categoria</th>
                      <th style={{ ...s.th, textAlign: "right" }}>Valor planejado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cats.map((cat, i) => (
                      <tr key={cat.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }} className="tr-hover">
                        <td style={s.td}>{cat.nome}</td>
                        <td style={{ ...s.td, textAlign: "right" }}>
                          <CelulaValor
                            valor={plano[cat.id]?.valor || 0}
                            onChange={v => editarValor(cat.id, v)}
                            saving={saving}
                          />
                        </td>
                      </tr>
                    ))}
                    {tipo.key === "despesa_fixa" && parcelasEmprestimos.map((parcela, i) => (
                      <tr key={`emp-${parcela.id}`} style={{ background: (cats.length + i) % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                        <td style={s.td}>
                          <span style={{ color: "#9ca3af" }}>{parcela.emprestimo?.nome || "Emprestimo"} #{parcela.numero_parcela}</span>
                          <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 6, background: "#1a1f2e", padding: "1px 6px", borderRadius: 4, border: "1px solid #2a2f3e" }}>emprestimo</span>
                        </td>
                        <td style={{ ...s.td, textAlign: "right" }}>
                          <span style={{ color: "#f97316", fontWeight: 700 }}>{fmtBRL(parcela.valor_previsto)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          ...s.toast,
          background: toast.tipo === "erro" ? "rgba(239,68,68,0.15)" : toast.tipo === "aviso" ? "rgba(250,204,21,0.15)" : "rgba(16,185,129,0.15)",
          borderColor: toast.tipo === "erro" ? "rgba(239,68,68,0.3)" : toast.tipo === "aviso" ? "rgba(250,204,21,0.3)" : "rgba(16,185,129,0.3)",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#0f1419",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#fff",
    paddingBottom: 60,
  },
  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #2a2f3e",
    background: "rgba(15,20,25,0.92)",
    position: "sticky", top: 0, zIndex: 10,
    backdropFilter: "blur(16px)",
    flexWrap: "wrap", gap: 16,
  },
  topbarTitle: { fontSize: 22, fontWeight: 800, letterSpacing: -0.5 },
  topbarSub:   { fontSize: 12, color: "#9ca3af", marginTop: 2, letterSpacing: 1, textTransform: "uppercase" },
  topbarControls: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  mesSelector: {
    display: "flex", alignItems: "center", gap: 4,
    background: "#1a1f2e", borderRadius: 12,
    border: "1px solid #2a2f3e", padding: "4px 8px",
  },
  mesLabel: { fontSize: 14, fontWeight: 700, minWidth: 140, textAlign: "center", color: "#fff" },
  navBtn: {
    background: "none", border: "none", color: "#9ca3af",
    fontSize: 20, cursor: "pointer", padding: "0 6px", lineHeight: 1,
    borderRadius: 6, transition: "color 0.15s",
  },
  btnCopiar: {
    background: "#1a1f2e", border: "1px solid #2a2f3e",
    color: "#9ca3af", borderRadius: 12, padding: "8px 16px",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    transition: "all 0.15s",
  },
  btnSalvar: {
    background: "linear-gradient(135deg, #10b981, #14b8a6)", border: "none",
    color: "#fff", borderRadius: 12, padding: "8px 20px",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    transition: "all 0.15s",
  },
  resumoRow: {
    display: "flex", gap: 16,
    padding: "20px 24px 0",
    flexWrap: "wrap",
  },
  resumoCard: {
    flex: "1 1 160px",
    background: "#1a1f2e",
    border: "1px solid",
    borderRadius: 16,
    padding: "16px 20px",
    display: "flex", flexDirection: "column", gap: 4,
  },
  resumoLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 },
  resumoValor: { fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: "#fff" },
  loadingWrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: 80,
  },
  spinner: {
    width: 32, height: 32, borderRadius: "50%",
    border: "3px solid #2a2f3e",
    borderTopColor: "#10b981",
    animation: "spin 0.8s linear infinite",
  },
  tablesWrap: {
    display: "flex", flexDirection: "column", gap: 24,
    padding: "20px 24px",
  },
  tableCard: {
    background: "#1a1f2e",
    border: "1px solid #2a2f3e",
    borderRadius: 20,
    overflow: "hidden",
  },
  tableHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid",
  },
  tipoTag: {
    fontSize: 12, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: 1,
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "10px 20px", fontSize: 11, fontWeight: 700,
    color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.8,
    textAlign: "left",
  },
  td: { padding: "12px 20px", fontSize: 14, color: "#fff", borderTop: "1px solid #2a2f3e" },
  celulaValor: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 14, fontWeight: 600,
    transition: "background 0.15s",
  },
  celulaInput: {
    background: "#0f1419", border: "1px solid #10b981",
    borderRadius: 6, color: "#fff",
    padding: "4px 10px", fontSize: 14, fontWeight: 600,
    outline: "none", width: 140, textAlign: "right",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  toast: {
    position: "fixed", bottom: 32, right: 32,
    padding: "14px 24px", borderRadius: 12,
    border: "1px solid", fontSize: 13, fontWeight: 600,
    color: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    animation: "slideIn 0.3s ease",
    maxWidth: 360,
  },
};

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f1419; }
  .title-gradient {
    background: linear-gradient(90deg, #fff 40%, #10b981 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .tr-hover:hover td { background: rgba(255,255,255,0.03) !important; }
  .btn-salvar:hover:not(:disabled) { opacity: 0.88; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
`;
