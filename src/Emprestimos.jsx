import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL;

function fmtBRL(v) {
  return (parseFloat(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(d) {
  if (!d) return "—";
  const [ano, mes, dia] = d.split("-");
  return `${dia}/${mes}/${ano}`;
}

function diasAteVencer(dataStr) {
  if (!dataStr) return null;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const venc = new Date(dataStr + "T00:00:00");
  return Math.round((venc - hoje) / 86400000);
}

function BadgeVencimento({ data }) {
  const dias = diasAteVencer(data);
  if (dias === null) return null;
  if (dias < 0)  return <span style={{ ...s.badge, background: "#7f1d1d", color: "#fca5a5" }}>Vencida há {Math.abs(dias)}d</span>;
  if (dias === 0) return <span style={{ ...s.badge, background: "#7f1d1d", color: "#fca5a5" }}>Vence hoje!</span>;
  if (dias <= 5)  return <span style={{ ...s.badge, background: "#78350f", color: "#fcd34d" }}>Vence em {dias}d</span>;
  return <span style={{ ...s.badge, background: "#0c1a2e", color: "#94a3b8" }}>Vence em {dias}d</span>;
}

function ModalNovoEmprestimo({ emprestimo, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome: emprestimo?.nome || "",
    valor_total: emprestimo?.valor_total ? String(emprestimo.valor_total).replace(".", ",") : "",
    valor_parcela: emprestimo?.valor_parcela ? String(emprestimo.valor_parcela).replace(".", ",") : "",
    total_parcelas: emprestimo?.total_parcelas ? String(emprestimo.total_parcelas) : "",
    data_inicio: emprestimo?.data_inicio || new Date().toISOString().slice(0,10),
    dia_vencimento: emprestimo?.dia_vencimento ? String(emprestimo.dia_vencimento) : "",
    credor: emprestimo?.credor || "",
    taxa_juros_mensal: emprestimo?.taxa_juros_mensal ? String(parseFloat(emprestimo.taxa_juros_mensal) * 100).replace(".", ",") : "",
    observacao: emprestimo?.observacao || "",
  });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function salvar() {
    if (!form.nome)           { setErro("Informe o nome."); return; }
    if (!form.valor_total)    { setErro("Informe o valor total."); return; }
    if (!form.valor_parcela)  { setErro("Informe o valor da parcela."); return; }
    if (!form.total_parcelas) { setErro("Informe o número de parcelas."); return; }
    if (!form.data_inicio)    { setErro("Informe a data de início."); return; }
    setSaving(true); setErro("");
    try {
      await onSalvar({
        nome:               form.nome,
        valor_total:        parseFloat(form.valor_total.replace(",",".")),
        valor_parcela:      parseFloat(form.valor_parcela.replace(",",".")),
        total_parcelas:     parseInt(form.total_parcelas),
        data_inicio:        form.data_inicio,
        dia_vencimento:     form.dia_vencimento ? parseInt(form.dia_vencimento) : null,
        credor:             form.credor || null,
        taxa_juros_mensal:  form.taxa_juros_mensal ? parseFloat(form.taxa_juros_mensal.replace(",",".")) / 100 : null,
        observacao:         form.observacao || null,
      });
    } catch { setErro("Erro ao salvar."); }
    finally  { setSaving(false); }
  }

  return (
    <div style={s.overlay} onClick={onFechar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <span style={s.modalTitulo}>{emprestimo ? "Editar Emprestimo" : "Novo Emprestimo"}</span>
          <button style={s.modalFechar} onClick={onFechar}>✕</button>
        </div>
        <div style={s.modalBody}>
          {[
            { label: "Nome / Descrição *", key: "nome", placeholder: "Ex: Financiamento carro" },
            { label: "Credor", key: "credor", placeholder: "Ex: Banco Itaú" },
            { label: "Valor Total (R$) *", key: "valor_total", placeholder: "Ex: 15000,00", inputMode: "decimal" },
            { label: "Valor da Parcela (R$) *", key: "valor_parcela", placeholder: "Ex: 850,00", inputMode: "decimal" },
            { label: "Nº de Parcelas *", key: "total_parcelas", placeholder: "Ex: 24", inputMode: "numeric" },
            { label: "Data de Início *", key: "data_inicio", type: "date" },
            { label: "Dia de Vencimento", key: "dia_vencimento", placeholder: "Ex: 10", inputMode: "numeric" },
            { label: "Taxa de Juros Mensal (%)", key: "taxa_juros_mensal", placeholder: "Ex: 1,99", inputMode: "decimal" },
          ].map(f => (
            <div key={f.key} style={s.formField}>
              <label style={s.formLabel}>{f.label}</label>
              <input
                style={s.formInput}
                type={f.type || "text"}
                inputMode={f.inputMode}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
              />
            </div>
          ))}
          <div style={s.formField}>
            <label style={s.formLabel}>Observação</label>
            <textarea
              style={{ ...s.formInput, minHeight: 72, resize: "vertical" }}
              placeholder="Observações adicionais..."
              value={form.observacao}
              onChange={e => set("observacao", e.target.value)}
            />
          </div>
          {erro && <div style={s.erro}>{erro}</div>}
          <button style={s.btnSalvar} onClick={salvar} disabled={saving}>
            {saving ? "Salvando..." : emprestimo ? "Salvar alteracoes" : "Cadastrar Emprestimo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CardEmprestimo({ emp, excluindo, onEditar, onExcluir, onPagarParcela }) {
  const [expandido, setExpandido]   = useState(false);
  const [parcelas, setParcelas]     = useState([]);
  const [loadParcelas, setLoadParcelas] = useState(false);
  const [pagando, setPagando]       = useState(null);

  const pct = emp.total_parcelas > 0
    ? Math.round((emp.parcelas_pagas / emp.total_parcelas) * 100) : 0;

  const proximaPendente = parcelas.find(p => p.status === "pendente" || p.status === "atrasada");

  async function carregarParcelas() {
    if (parcelas.length) { setExpandido(e => !e); return; }
    setLoadParcelas(true);
    const data = await fetch(`${API_URL}/emprestimos/${emp.id}/parcelas`).then(r => r.json());
    setParcelas(data);
    setLoadParcelas(false);
    setExpandido(true);
  }

  async function pagarParcela(parcela) {
    setPagando(parcela.id);
    try {
      await onPagarParcela(emp.id, parcela.id);
      const data = await fetch(`${API_URL}/emprestimos/${emp.id}/parcelas`).then(r => r.json());
      setParcelas(data);
    } finally { setPagando(null); }
  }

  return (
    <div style={{ ...s.card, borderColor: emp.status === "quitado" ? "#1e3a1e" : "#1e293b" }}>

      {/* Cabeçalho */}
      <div style={s.cardHeader}>
        <div>
          <div style={s.cardNome}>{emp.nome}</div>
          {emp.credor && <div style={s.cardCredor}>{emp.credor}</div>}
          <div style={s.cardAcoes}>
            <button style={s.btnAcaoCard} onClick={() => onEditar(emp)}>Editar</button>
            <button style={s.btnAcaoPerigo} onClick={() => onExcluir(emp)} disabled={excluindo === emp.id}>
              {excluindo === emp.id ? "..." : "Excluir"}
            </button>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={s.cardParcela}>{fmtBRL(emp.valor_parcela)}<span style={s.cardParcelaLabel}>/mês</span></div>
          {emp.status === "quitado"
            ? <span style={{ ...s.badge, background: "#052e16", color: "#86efac" }}>✓ Quitado</span>
            : <span style={{ ...s.badge, background: "#0c1a2e", color: "#93c5fd" }}>{emp.parcelas_pagas}/{emp.total_parcelas} pagas</span>
          }
        </div>
      </div>

      {/* Barra de progresso */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={s.barraLabel}>Progresso</span>
          <span style={s.barraLabel}>{pct}%</span>
        </div>
        <div style={s.barraFundo}>
          <div style={{
            ...s.barraPreenchida,
            width: `${pct}%`,
            background: emp.status === "quitado" ? "#22c55e" : "#3b82f6",
          }} />
        </div>
      </div>

      {/* Info resumida */}
      <div style={s.cardInfo}>
        <div style={s.cardInfoBloco}>
          <span style={s.cardInfoLabel}>Total</span>
          <span style={s.cardInfoValor}>{fmtBRL(emp.valor_total)}</span>
        </div>
        <div style={s.cardInfoBloco}>
          <span style={s.cardInfoLabel}>Restantes</span>
          <span style={s.cardInfoValor}>{emp.total_parcelas - emp.parcelas_pagas}x</span>
        </div>
        <div style={s.cardInfoBloco}>
          <span style={s.cardInfoLabel}>Saldo devedor</span>
          <span style={s.cardInfoValor}>
            {fmtBRL((emp.total_parcelas - emp.parcelas_pagas) * parseFloat(emp.valor_parcela))}
          </span>
        </div>
      </div>

      {/* Próxima parcela */}
      {proximaPendente && (
        <div style={s.proximaParcela}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={s.cardInfoLabel}>Próxima parcela:</span>
            <span style={{ color: "#cbd5e1", fontWeight: 600, fontSize: 13 }}>
              {proximaPendente.numero_parcela}ª — {fmtBRL(proximaPendente.valor_previsto)} — {fmtData(proximaPendente.data_vencimento)}
            </span>
            <BadgeVencimento data={proximaPendente.data_vencimento} />
          </div>
          <button
            style={s.btnPagar}
            onClick={() => pagarParcela(proximaPendente)}
            disabled={pagando === proximaPendente.id}
          >
            {pagando === proximaPendente.id ? "..." : "Registrar pagamento"}
          </button>
        </div>
      )}

      {/* Botão expandir parcelas */}
      {emp.status !== "quitado" && (
        <button style={s.btnExpandir} onClick={carregarParcelas}>
          {loadParcelas ? "Carregando..." : expandido ? "▲ Ocultar parcelas" : "▼ Ver todas as parcelas"}
        </button>
      )}

      {/* Lista de parcelas */}
      {expandido && parcelas.length > 0 && (
        <div style={s.listaParcelas}>
          {parcelas.map(p => (
            <div key={p.id} style={{
              ...s.linhaParcela,
              opacity: p.status === "paga" ? 0.5 : 1,
              background: p.status === "atrasada" ? "#1a0800" : "transparent",
            }}>
              <span style={s.parcelaNum}>#{p.numero_parcela}</span>
              <span style={s.parcelaData}>{fmtData(p.data_vencimento)}</span>
              <span style={s.parcelaValor}>{fmtBRL(p.valor_previsto)}</span>
              <span style={{
                ...s.parcelaStatus,
                color: p.status === "paga" ? "#22c55e" : p.status === "atrasada" ? "#ef4444" : "#94a3b8",
              }}>
                {p.status === "paga" ? "✓ Paga" : p.status === "atrasada" ? "⚠ Atrasada" : "Pendente"}
              </span>
              {p.status !== "paga" && (
                <button
                  style={s.btnPagarMini}
                  onClick={() => pagarParcela(p)}
                  disabled={pagando === p.id}
                >
                  {pagando === p.id ? "..." : "Pagar"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Emprestimos() {
  const [emprestimos, setEmprestimos] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando]       = useState(null);
  const [excluindo, setExcluindo]     = useState(null);
  const [filtro, setFiltro]           = useState("ativo");

  const carregar = useCallback(() => {
    setLoading(true);
    fetch(`${API_URL}/emprestimos/${filtro ? `?status=${filtro}` : ""}`)
      .then(r => r.json())
      .then(setEmprestimos)
      .finally(() => setLoading(false));
  }, [filtro]);

  useEffect(() => { carregar(); }, [carregar]);

  async function criarEmprestimo(payload) {
    const res = await fetch(`${API_URL}/emprestimos/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error();
    setModalAberto(false);
    carregar();
  }

  async function atualizarEmprestimo(id, payload) {
    const res = await fetch(`${API_URL}/emprestimos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error();
    setEditando(null);
    carregar();
  }

  async function excluirEmprestimo(emp) {
    const confirmar = window.confirm(`Excluir o emprestimo "${emp.nome}" e suas parcelas?`);
    if (!confirmar) return;
    setExcluindo(emp.id);
    try {
      await fetch(`${API_URL}/emprestimos/${emp.id}`, { method: "DELETE" });
      carregar();
    } finally {
      setExcluindo(null);
    }
  }

  async function pagarParcela(emprestimoId, parcelaId) {
    await fetch(`${API_URL}/emprestimos/${emprestimoId}/parcelas/${parcelaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "paga",
        data_pagamento: new Date().toISOString().slice(0,10),
        valor_pago: null,
      }),
    });
    carregar();
  }

  const totalMensal = emprestimos
    .filter(e => e.status === "ativo")
    .reduce((s, e) => s + parseFloat(e.valor_parcela), 0);

  return (
    <div style={s.page}>
      <style>{css}</style>

      {/* Topbar */}
      <div style={s.topbar}>
        <div>
          <div style={s.topbarTitle}>Empréstimos</div>
          <div style={s.topbarSub}>Finança Familiar</div>
        </div>
        <div style={s.topbarAcoes}>
          {/* Filtro */}
          <div style={s.filtroRow}>
            {["ativo","quitado",""].map((f, i) => (
              <button
                key={i}
                style={{ ...s.filtroBotao, ...(filtro === f ? s.filtroBotaoAtivo : {}) }}
                onClick={() => setFiltro(f)}
              >
                {f === "ativo" ? "Ativos" : f === "quitado" ? "Quitados" : "Todos"}
              </button>
            ))}
          </div>
          <button style={s.btnNovo} onClick={() => setModalAberto(true)}>+ Novo</button>
        </div>
      </div>

      {/* Resumo */}
      {filtro === "ativo" && emprestimos.length > 0 && (
        <div style={s.resumo}>
          <div style={s.resumoBloco}>
            <span style={s.resumoLabel}>Compromisso mensal</span>
            <span style={s.resumoValor}>{fmtBRL(totalMensal)}</span>
          </div>
          <div style={s.resumoBloco}>
            <span style={s.resumoLabel}>Empréstimos ativos</span>
            <span style={s.resumoValor}>{emprestimos.length}</span>
          </div>
        </div>
      )}

      {/* Lista */}
      <div style={s.body}>
        {loading ? (
          <div style={s.loadingWrap}><div style={s.spinner} /></div>
        ) : emprestimos.length === 0 ? (
          <div style={s.vazio}>
            <span style={{ fontSize: 40 }}>🏦</span>
            <span style={{ color: "#94a3b8", marginTop: 12 }}>
              {filtro === "ativo" ? "Nenhum empréstimo ativo." : "Nenhum empréstimo encontrado."}
            </span>
            <button style={{ ...s.btnNovo, marginTop: 20 }} onClick={() => setModalAberto(true)}>
              + Cadastrar empréstimo
            </button>
          </div>
        ) : (
          emprestimos.map(emp => (
            <CardEmprestimo
              key={emp.id}
              emp={emp}
              excluindo={excluindo}
              onEditar={setEditando}
              onExcluir={excluirEmprestimo}
              onPagarParcela={pagarParcela}
            />
          ))
        )}
      </div>

      {modalAberto && (
        <ModalNovoEmprestimo onSalvar={criarEmprestimo} onFechar={() => setModalAberto(false)} />
      )}
      {editando && (
        <ModalNovoEmprestimo
          emprestimo={editando}
          onSalvar={(payload) => atualizarEmprestimo(editando.id, payload)}
          onFechar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#080f1a", fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0", paddingBottom: 80 },
  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px", borderBottom: "1px solid #1e293b",
    position: "sticky", top: 0, zIndex: 10,
    background: "#080f1acc", backdropFilter: "blur(12px)",
    flexWrap: "wrap", gap: 12,
  },
  topbarTitle: { fontSize: 20, fontWeight: 800, letterSpacing: -0.5 },
  topbarSub:   { fontSize: 11, color: "#94a3b8", marginTop: 2, letterSpacing: 1, textTransform: "uppercase" },
  topbarAcoes: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  filtroRow:   { display: "flex", gap: 4 },
  filtroBotao: {
    background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8,
    color: "#94a3b8", padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
  },
  filtroBotaoAtivo: { background: "#1e293b", color: "#e2e8f0", borderColor: "#7c8fa8" },
  btnNovo: {
    background: "#1d4ed8", border: "none", borderRadius: 10,
    color: "#fff", padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
  },
  resumo: {
    display: "flex", gap: 16, padding: "16px 20px",
    borderBottom: "1px solid #1e293b", flexWrap: "wrap",
  },
  resumoBloco: { display: "flex", flexDirection: "column", gap: 2 },
  resumoLabel: { fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 },
  resumoValor: { fontSize: 22, fontWeight: 800, letterSpacing: -0.5 },
  body: { display: "flex", flexDirection: "column", gap: 16, padding: "20px", maxWidth: 800, margin: "0 auto" },
  loadingWrap: { display: "flex", alignItems: "center", justifyContent: "center", padding: 80 },
  spinner: { width: 32, height: 32, borderRadius: "50%", border: "3px solid #1e293b", borderTopColor: "#3b82f6", animation: "spin 0.8s linear infinite" },
  vazio: { display: "flex", flexDirection: "column", alignItems: "center", padding: 60, textAlign: "center", lineHeight: 1.8 },
  card: { background: "#0a1628", border: "1px solid", borderRadius: 16, padding: "20px", display: "flex", flexDirection: "column", gap: 16 },
  cardHeader:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  cardNome:        { fontSize: 16, fontWeight: 800, color: "#e2e8f0" },
  cardCredor:      { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  cardAcoes:       { display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" },
  btnAcaoCard:     { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#cbd5e1", padding: "6px 10px", fontSize: 12, cursor: "pointer" },
  btnAcaoPerigo:   { background: "#1a0a0a", border: "1px solid #7f1d1d", borderRadius: 8, color: "#fca5a5", padding: "6px 10px", fontSize: 12, cursor: "pointer" },
  cardParcela:     { fontSize: 20, fontWeight: 800, color: "#3b82f6", textAlign: "right" },
  cardParcelaLabel:{ fontSize: 11, color: "#94a3b8", fontWeight: 400 },
  badge:           { display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginTop: 4 },
  barraLabel:      { fontSize: 11, color: "#94a3b8" },
  barraFundo:      { width: "100%", height: 8, background: "#1e293b", borderRadius: 99, overflow: "hidden" },
  barraPreenchida: { height: "100%", borderRadius: 99, transition: "width 0.6s ease" },
  cardInfo:        { display: "flex", gap: 0, borderTop: "1px solid #1e293b", paddingTop: 12 },
  cardInfoBloco:   { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  cardInfoLabel:   { fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 },
  cardInfoValor:   { fontSize: 13, fontWeight: 700, color: "#94a3b8" },
  proximaParcela:  { background: "#0f172a", borderRadius: 10, padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  btnPagar:        { background: "#1d4ed8", border: "none", borderRadius: 8, color: "#fff", padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  btnExpandir:     { background: "none", border: "1px solid #1e293b", borderRadius: 8, color: "#94a3b8", padding: "8px", fontSize: 12, cursor: "pointer", textAlign: "center" },
  listaParcelas:   { display: "flex", flexDirection: "column", gap: 2, maxHeight: 300, overflowY: "auto", borderRadius: 8 },
  linhaParcela:    { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, flexWrap: "wrap" },
  parcelaNum:      { fontSize: 11, color: "#94a3b8", minWidth: 28 },
  parcelaData:     { fontSize: 12, color: "#94a3b8", minWidth: 80 },
  parcelaValor:    { fontSize: 12, fontWeight: 700, color: "#cbd5e1", flex: 1 },
  parcelaStatus:   { fontSize: 11, fontWeight: 600 },
  btnPagarMini:    { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, color: "#94a3b8", padding: "4px 10px", fontSize: 11, cursor: "pointer" },
  overlay:         { position: "fixed", inset: 0, background: "#000000aa", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  modal:           { background: "#0f172a", border: "1px solid #1e293b", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 520, maxHeight: "90dvh", overflowY: "auto" },
  modalHeader:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 20px 0" },
  modalTitulo:     { fontSize: 18, fontWeight: 800 },
  modalFechar:     { background: "none", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" },
  modalBody:       { padding: "20px", display: "flex", flexDirection: "column", gap: 14 },
  formField:       { display: "flex", flexDirection: "column", gap: 6 },
  formLabel:       { fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 },
  formInput:       { background: "#1e293b", border: "1px solid #334155", borderRadius: 10, color: "#e2e8f0", padding: "12px 14px", fontSize: 14, outline: "none", fontFamily: "'DM Sans', sans-serif" },
  btnSalvar:       { background: "#1d4ed8", border: "none", borderRadius: 12, color: "#fff", padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  erro:            { color: "#ef4444", fontSize: 13, background: "#1a0a0a", borderRadius: 8, padding: "10px 14px" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080f1a; }
  input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.4); }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
