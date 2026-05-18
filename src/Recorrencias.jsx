import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;
const MEIOS = ["pix", "cartao", "debito", "dinheiro", "transferencia", "outros"];

function fmtBRL(v) {
  return (parseFloat(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseValor(v) {
  return parseFloat(String(v || "0").replace(/\./g, "").replace(",", ".")) || 0;
}

export default function Recorrencias() {
  const hoje = new Date();
  const [recorrencias, setRecorrencias] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    dia: "1",
    categoria_id: "",
    meio_pagamento: "pix",
    cartao_id: "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function carregar() {
    setLoading(true);
    const [recs, cats, cards] = await Promise.all([
      fetch(`${API_URL}/recorrencias/?ativo=true`).then(r => r.json()),
      fetch(`${API_URL}/categorias/?ativo=true`).then(r => r.json()),
      fetch(`${API_URL}/cartoes/?ativo=true`).then(r => r.json()),
    ]);
    setRecorrencias(recs);
    setCategorias(cats);
    setCartoes(cards);
    setForm(f => ({
      ...f,
      categoria_id: f.categoria_id || cats[0]?.id || "",
      cartao_id: f.cartao_id || cards[0]?.id || "",
    }));
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregar(); }, []);

  async function criar() {
    if (!form.descricao.trim() || !parseValor(form.valor) || !form.categoria_id) return;
    setSaving(true);
    const payload = {
      descricao: form.descricao.trim(),
      valor: parseValor(form.valor),
      dia: Number(form.dia),
      categoria_id: form.categoria_id,
      meio_pagamento: form.meio_pagamento,
      cartao_id: form.meio_pagamento === "cartao" ? form.cartao_id : null,
    };
    const res = await fetch(`${API_URL}/recorrencias/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setForm(f => ({ ...f, descricao: "", valor: "" }));
      carregar();
    }
  }

  async function desativar(id) {
    await fetch(`${API_URL}/recorrencias/${id}`, { method: "DELETE" });
    carregar();
  }

  async function gerarMes() {
    setSaving(true);
    const criados = await fetch(`${API_URL}/recorrencias/gerar?mes=${mes}&ano=${ano}`, { method: "POST" }).then(r => r.json());
    setSaving(false);
    setToast(`${criados.length} lancamento(s) gerado(s).`);
    setTimeout(() => setToast(""), 2500);
  }

  return (
    <div style={s.page}>
      <style>{css}</style>
      <div style={s.topbar}>
        <div>
          <div style={s.title}>Recorrencias</div>
          <div style={s.sub}>Despesas e receitas automaticas</div>
        </div>
        <div style={s.controls}>
          <input style={s.smallInput} type="number" min="1" max="12" value={mes} onChange={e => setMes(Number(e.target.value))} />
          <input style={s.smallInput} type="number" value={ano} onChange={e => setAno(Number(e.target.value))} />
          <button style={s.btnPrimario} onClick={gerarMes} disabled={saving}>Gerar mes</button>
        </div>
      </div>

      <div style={s.body}>
        <div style={s.card}>
          <div style={s.cardTitle}>Nova recorrencia</div>
          <div style={s.grid}>
            <input style={s.input} placeholder="Descricao" value={form.descricao} onChange={e => set("descricao", e.target.value)} />
            <input style={s.input} placeholder="Valor" inputMode="decimal" value={form.valor} onChange={e => set("valor", e.target.value)} />
            <input style={s.input} placeholder="Dia" inputMode="numeric" value={form.dia} onChange={e => set("dia", e.target.value)} />
            <select style={s.input} value={form.categoria_id} onChange={e => set("categoria_id", e.target.value)}>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <select style={s.input} value={form.meio_pagamento} onChange={e => set("meio_pagamento", e.target.value)}>
              {MEIOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {form.meio_pagamento === "cartao" && (
              <select style={s.input} value={form.cartao_id} onChange={e => set("cartao_id", e.target.value)}>
                {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            )}
          </div>
          <button style={s.btnPrimario} onClick={criar} disabled={saving}>Cadastrar</button>
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>Ativas</div>
          {loading ? (
            <div style={s.empty}>Carregando...</div>
          ) : recorrencias.length === 0 ? (
            <div style={s.empty}>Nenhuma recorrencia ativa.</div>
          ) : recorrencias.map(r => (
            <div key={r.id} style={s.row}>
              <div>
                <strong>{r.descricao}</strong>
                <div style={s.meta}>Dia {r.dia} · {fmtBRL(r.valor)} · {r.meio_pagamento}</div>
              </div>
              <button style={s.btnDanger} onClick={() => desativar(r.id)}>Desativar</button>
            </div>
          ))}
        </div>
      </div>

      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#0f1419", color: "#e2e8f0", fontFamily: "system-ui, -apple-system, sans-serif", paddingBottom: 80 },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: 20, borderBottom: "1px solid #2a2f3e", position: "sticky", top: 0, zIndex: 10, background: "rgba(15,20,25,0.92)", backdropFilter: "blur(12px)" },
  title: { fontSize: 20, fontWeight: 800 },
  sub: { color: "#94a3b8", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  controls: { display: "flex", gap: 8, flexWrap: "wrap" },
  body: { maxWidth: 900, margin: "0 auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 },
  card: { background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 12 },
  cardTitle: { fontWeight: 800 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 },
  input: { background: "#1e2636", border: "1px solid #2a2f3e", borderRadius: 10, color: "#e2e8f0", padding: "11px 12px" },
  smallInput: { width: 76, background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: 10, color: "#e2e8f0", padding: "9px 10px" },
  btnPrimario: { background: "linear-gradient(135deg, #10b981, #14b8a6)", border: "none", borderRadius: 10, color: "#fff", padding: "9px 14px", fontWeight: 700, cursor: "pointer" },
  btnDanger: { background: "#1a0a0a", border: "1px solid #7f1d1d", borderRadius: 8, color: "#fca5a5", padding: "7px 10px", cursor: "pointer" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid #141824" },
  meta: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  empty: { color: "#94a3b8", padding: 20, textAlign: "center" },
  toast: { position: "fixed", right: 24, bottom: 24, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 12, padding: "12px 18px", fontWeight: 700, color: "#6ee7b7" },
};

const css = `
  * { box-sizing: border-box; }
  body { background: #0f1419; }
  select option { background: #1a1f2e; color: #e2e8f0; }
`;
