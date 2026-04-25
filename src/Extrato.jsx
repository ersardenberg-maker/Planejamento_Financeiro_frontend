import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const MESES = ["Janeiro","Fevereiro","Marco","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MEIOS = ["todos", "pix", "cartao", "debito", "dinheiro", "transferencia", "outros"];

function fmtBRL(v) {
  return (parseFloat(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(d) {
  if (!d) return "-";
  const [ano, mes, dia] = d.split("-");
  return `${dia}/${mes}/${ano}`;
}

function parseValor(v) {
  return parseFloat(String(v || "0").replace(/\./g, "").replace(",", ".")) || 0;
}

function ModalEditar({ item, categorias, cartoes, onFechar, onSalvar }) {
  const [form, setForm] = useState({
    descricao: item.descricao || "",
    valor: String(item.valor || "").replace(".", ","),
    data: item.data,
    categoria_id: item.categoria_id,
    meio_pagamento: item.meio_pagamento,
    cartao_id: item.cartao_id || "",
    mes_fatura: item.mes_fatura || new Date(item.data).getMonth() + 1,
    ano_fatura: item.ano_fatura || new Date(item.data).getFullYear(),
    observacao: item.observacao || "",
  });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function salvar() {
    if (!form.categoria_id) return setErro("Selecione uma categoria.");
    if (!parseValor(form.valor)) return setErro("Informe um valor valido.");
    setSaving(true);
    setErro("");
    try {
      await onSalvar(item.id, {
        descricao: form.descricao || null,
        valor: parseValor(form.valor),
        data: form.data,
        categoria_id: form.categoria_id,
        meio_pagamento: form.meio_pagamento,
        cartao_id: form.meio_pagamento === "cartao" ? form.cartao_id : null,
        mes_fatura: form.meio_pagamento === "cartao" ? Number(form.mes_fatura) : null,
        ano_fatura: form.meio_pagamento === "cartao" ? Number(form.ano_fatura) : null,
        observacao: form.observacao || null,
      });
      onFechar();
    } catch {
      setErro("Nao foi possivel salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.overlay} onClick={onFechar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <strong>Editar lancamento</strong>
          <button style={s.iconBtn} onClick={onFechar}>x</button>
        </div>
        <div style={s.modalBody}>
          <label style={s.label}>Descricao</label>
          <input style={s.input} value={form.descricao} onChange={e => set("descricao", e.target.value)} />

          <label style={s.label}>Valor</label>
          <input style={s.input} inputMode="decimal" value={form.valor} onChange={e => set("valor", e.target.value)} />

          <label style={s.label}>Data</label>
          <input style={s.input} type="date" value={form.data} onChange={e => set("data", e.target.value)} />

          <label style={s.label}>Categoria</label>
          <select style={s.input} value={form.categoria_id} onChange={e => set("categoria_id", e.target.value)}>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>

          <label style={s.label}>Meio de pagamento</label>
          <select style={s.input} value={form.meio_pagamento} onChange={e => set("meio_pagamento", e.target.value)}>
            {MEIOS.filter(m => m !== "todos").map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {form.meio_pagamento === "cartao" && (
            <>
              <label style={s.label}>Cartao</label>
              <select style={s.input} value={form.cartao_id} onChange={e => set("cartao_id", e.target.value)}>
                {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <div style={s.duasColunas}>
                <div>
                  <label style={s.label}>Mes fatura</label>
                  <select style={s.input} value={form.mes_fatura} onChange={e => set("mes_fatura", e.target.value)}>
                    {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Ano</label>
                  <input style={s.input} type="number" value={form.ano_fatura} onChange={e => set("ano_fatura", e.target.value)} />
                </div>
              </div>
            </>
          )}

          {erro && <div style={s.erro}>{erro}</div>}
          <button style={s.btnPrimario} onClick={salvar} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Extrato() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [meio, setMeio] = useState("todos");
  const [busca, setBusca] = useState("");
  const [lancamentos, setLancamentos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/categorias/?ativo=true`).then(r => r.json()),
      fetch(`${API_URL}/cartoes/?ativo=true`).then(r => r.json()),
    ]).then(([cats, cards]) => {
      setCategorias(cats);
      setCartoes(cards);
    });
  }, []);

  const carregar = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ mes, ano });
    if (meio !== "todos") params.set("meio_pagamento", meio);
    fetch(`${API_URL}/lancamentos/?${params}`)
      .then(r => r.json())
      .then(setLancamentos)
      .finally(() => setLoading(false));
  }, [mes, ano, meio]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return lancamentos;
    return lancamentos.filter(l =>
      (l.descricao || "").toLowerCase().includes(termo) ||
      (l.categoria?.nome || "").toLowerCase().includes(termo) ||
      (l.cartao?.nome || "").toLowerCase().includes(termo)
    );
  }, [busca, lancamentos]);

  const total = filtrados.reduce((soma, l) => soma + parseFloat(l.valor || 0), 0);

  async function salvar(id, payload) {
    const res = await fetch(`${API_URL}/lancamentos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error();
    carregar();
  }

  async function excluir(id) {
    await fetch(`${API_URL}/lancamentos/${id}`, { method: "DELETE" });
    carregar();
  }

  function mesAnterior() {
    if (mes === 1) { setMes(12); setAno(a => a - 1); }
    else setMes(m => m - 1);
  }

  function mesProximo() {
    if (mes === 12) { setMes(1); setAno(a => a + 1); }
    else setMes(m => m + 1);
  }

  return (
    <div style={s.page}>
      <style>{css}</style>
      <div style={s.topbar}>
        <div>
          <div style={s.title}>Extrato</div>
          <div style={s.sub}>Lancamentos do mes</div>
        </div>
        <div style={s.controls}>
          <div style={s.mesSelector}>
            <button style={s.navBtn} onClick={mesAnterior}>‹</button>
            <span style={s.mesLabel}>{MESES[mes - 1]} {ano}</span>
            <button style={s.navBtn} onClick={mesProximo}>›</button>
          </div>
          <select style={s.select} value={meio} onChange={e => setMeio(e.target.value)}>
            {MEIOS.map(m => <option key={m} value={m}>{m === "todos" ? "Todos" : m}</option>)}
          </select>
        </div>
      </div>

      <div style={s.body}>
        <div style={s.summary}>
          <div>
            <span style={s.summaryLabel}>Total filtrado</span>
            <strong style={s.summaryValue}>{fmtBRL(total)}</strong>
          </div>
          <input
            style={s.search}
            placeholder="Buscar por descricao, categoria ou cartao"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        <div style={s.list}>
          {loading ? (
            <div style={s.empty}>Carregando...</div>
          ) : filtrados.length === 0 ? (
            <div style={s.empty}>Nenhum lancamento encontrado.</div>
          ) : filtrados.map(l => (
            <div key={l.id} style={s.row}>
              <div style={s.rowMain}>
                <strong style={s.desc}>{l.descricao || "-"}</strong>
                <span style={s.meta}>
                  {fmtData(l.data)} · {l.categoria?.nome || "-"} · {l.meio_pagamento}
                  {l.cartao ? ` · ${l.cartao.nome}` : ""}
                </span>
              </div>
              <div style={s.rowActions}>
                <strong style={s.value}>{fmtBRL(l.valor)}</strong>
                <button style={s.smallBtn} onClick={() => setEditando(l)}>Editar</button>
                <button style={s.smallBtnDanger} onClick={() => excluir(l.id)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editando && (
        <ModalEditar
          item={editando}
          categorias={categorias}
          cartoes={cartoes}
          onFechar={() => setEditando(null)}
          onSalvar={salvar}
        />
      )}
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#080f1a", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: 20, borderBottom: "1px solid #1e293b", position: "sticky", top: 0, background: "#080f1acc", backdropFilter: "blur(12px)", zIndex: 10 },
  title: { fontSize: 20, fontWeight: 800 },
  sub: { fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 },
  controls: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  mesSelector: { display: "flex", alignItems: "center", gap: 4, background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b", padding: "4px 8px" },
  navBtn: { background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer", padding: "0 8px" },
  mesLabel: { minWidth: 140, textAlign: "center", fontSize: 13, fontWeight: 700 },
  select: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, color: "#e2e8f0", padding: "9px 12px" },
  body: { maxWidth: 920, margin: "0 auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 },
  summary: { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 14, padding: 16, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  summaryLabel: { display: "block", fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 },
  summaryValue: { display: "block", fontSize: 24, marginTop: 4 },
  search: { flex: "1 1 260px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, color: "#e2e8f0", padding: "12px 14px" },
  list: { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden" },
  row: { display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: "1px solid #0f172a", alignItems: "center" },
  rowMain: { minWidth: 0, display: "flex", flexDirection: "column", gap: 3 },
  desc: { fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  meta: { fontSize: 11, color: "#94a3b8" },
  rowActions: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  value: { fontSize: 14, whiteSpace: "nowrap" },
  smallBtn: { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#cbd5e1", padding: "6px 10px", fontSize: 12, cursor: "pointer" },
  smallBtnDanger: { background: "#1a0a0a", border: "1px solid #7f1d1d", borderRadius: 8, color: "#fca5a5", padding: "6px 10px", fontSize: 12, cursor: "pointer" },
  empty: { padding: 40, color: "#94a3b8", textAlign: "center" },
  overlay: { position: "fixed", inset: 0, background: "#000000aa", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  modal: { width: "100%", maxWidth: 520, maxHeight: "90dvh", overflowY: "auto", background: "#0f172a", border: "1px solid #1e293b", borderRadius: "20px 20px 0 0" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 0" },
  iconBtn: { background: "none", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" },
  modalBody: { display: "flex", flexDirection: "column", gap: 8, padding: 20 },
  label: { fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 },
  input: { width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, color: "#e2e8f0", padding: "11px 12px", fontSize: 14, boxSizing: "border-box" },
  duasColunas: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  erro: { color: "#fca5a5", background: "#1a0a0a", borderRadius: 8, padding: 10, fontSize: 13 },
  btnPrimario: { background: "#1d4ed8", border: "none", borderRadius: 12, color: "#fff", padding: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; }
  body { background: #080f1a; }
  select option { background: #1e293b; color: #e2e8f0; }
  @media (max-width: 640px) {
    .extrato-row { align-items: flex-start; }
  }
`;
