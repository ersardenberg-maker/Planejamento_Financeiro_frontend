import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const MEIOS = [
  { value: "pix",           label: "PIX",      icon: "⚡" },
  { value: "cartao",        label: "Cartão",   icon: "💳" },
  { value: "debito",        label: "Débito",   icon: "💰" },
  { value: "dinheiro",      label: "Dinheiro", icon: "💵" },
  { value: "transferencia", label: "TED/DOC",  icon: "🏦" },
  { value: "outros",        label: "Outros",   icon: "•"  },
];

const TIPOS = [
  { key: "receita",          label: "Receitas",   cor: "#22c55e", corFundo: "#052e16" },
  { key: "despesa_fixa",     label: "Fixas",      cor: "#f97316", corFundo: "#1c0a00" },
  { key: "despesa_variavel", label: "Variáveis",  cor: "#3b82f6", corFundo: "#0c1a2e" },
];

function fmt(value) {
  const n = parseFloat(value.replace(/\D/g, "")) / 100;
  return isNaN(n) ? "" : n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function LancarGasto() {
  const [categorias, setCategorias] = useState([]);
  const [cartoes, setCartoes]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState("");
  const [abaAtiva, setAbaAtiva]     = useState("despesa_variavel");

  const hoje = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    valor:          "",
    categoria_id:   "",
    descricao:      "",
    data:           hoje,
    meio_pagamento: "pix",
    cartao_id:      "",
    mes_fatura:     new Date().getMonth() + 1,
    ano_fatura:     new Date().getFullYear(),
    parcelado:      false,
    num_parcelas:   "2",
  });

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/categorias/?ativo=true`).then(r => r.json()),
      fetch(`${API_URL}/cartoes/?ativo=true`).then(r => r.json()),
    ]).then(([cats, cars]) => {
      setCategorias(cats);
      setCartoes(cars);
      if (cars.length) setForm(f => ({ ...f, cartao_id: cars[0].id }));
    }).finally(() => setLoading(false));
  }, []);

  function trocarAba(tipo) {
    setAbaAtiva(tipo);
    setForm(f => ({ ...f, categoria_id: "" }));
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleValor = e => {
    const raw = e.target.value.replace(/\D/g, "");
    set("valor", raw);
  };

  const valorFloat  = parseFloat((form.valor || "0").replace(/\D/g, "")) / 100;
  const catsDaAba   = categorias.filter(c => c.tipo === abaAtiva);
  const tipoAtivo   = TIPOS.find(t => t.key === abaAtiva);

  function gerarParcelas() {
    const n = parseInt(form.num_parcelas) || 1;
    const valorParcela = parseFloat((valorFloat / n).toFixed(2));
    let m = parseInt(form.mes_fatura, 10);
    let a = parseInt(form.ano_fatura, 10);
    const parcelas = [];
    for (let i = 0; i < n; i++) {
      parcelas.push({ mes: m, ano: a, valor: valorParcela, num: i + 1, total: n });
      m = m + 1;
      if (m > 12) { m = 1; a = a + 1; }
    }
    return parcelas;
  }

  async function salvar() {
    if (!valorFloat || valorFloat <= 0) { setError("Informe o valor."); return; }
    if (!form.categoria_id)             { setError("Selecione a categoria."); return; }

    setSaving(true); setError("");
    try {
      if (form.meio_pagamento === "cartao" && form.parcelado) {
        const parcelas = gerarParcelas();
        for (const p of parcelas) {
          const res = await fetch(`${API_URL}/lancamentos/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              categoria_id:   form.categoria_id,
              descricao:      form.descricao ? `${form.descricao} (${p.num}/${p.total})` : `Parcela ${p.num}/${p.total}`,
              valor:          p.valor,
              data:           form.data,
              meio_pagamento: "cartao",
              cartao_id:      form.cartao_id,
              mes_fatura:     p.mes,
              ano_fatura:     p.ano,
            }),
          });
          if (!res.ok) throw new Error();
        }
      } else {
        const res = await fetch(`${API_URL}/lancamentos/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoria_id:   form.categoria_id,
            descricao:      form.descricao || null,
            valor:          valorFloat,
            data:           form.data,
            meio_pagamento: form.meio_pagamento,
            cartao_id:      form.meio_pagamento === "cartao" ? form.cartao_id : null,
            mes_fatura:     form.meio_pagamento === "cartao" ? Number(form.mes_fatura) : null,
            ano_fatura:     form.meio_pagamento === "cartao" ? Number(form.ano_fatura) : null,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      setSuccess(true);
      setForm(f => ({ ...f, valor: "", descricao: "", data: hoje, categoria_id: "", parcelado: false, num_parcelas: "2" }));
      setTimeout(() => setSuccess(false), 2500);
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  if (loading) return (
    <div style={s.screen}>
      <div style={s.loader}><div style={s.loaderDot} /></div>
    </div>
  );

  return (
    <div style={s.screen}>
      <style>{css}</style>

      {/* Header */}
      <div style={s.header}>
        <span style={s.headerLabel}>Finança Familiar</span>
        <span style={s.headerDate}>
          {new Date().toLocaleDateString("pt-BR", { weekday:"short", day:"2-digit", month:"short" })}
        </span>
      </div>

      {/* Valor */}
      <div style={s.valorBlock}>
        <span style={s.cifrao}>R$</span>
        <input
          style={s.valorInput}
          inputMode="numeric"
          placeholder="0,00"
          value={form.valor ? fmt(form.valor) : ""}
          onChange={handleValor}
        />
      </div>

      {/* Card */}
      <div style={s.card}>

        {/* Abas */}
        <div style={s.abas}>
          {TIPOS.map(t => (
            <button
              key={t.key}
              style={{
                ...s.aba,
                color:        abaAtiva === t.key ? t.cor : "#475569",
                borderBottom: abaAtiva === t.key ? `2px solid ${t.cor}` : "2px solid transparent",
                background:   abaAtiva === t.key ? t.corFundo + "88" : "transparent",
              }}
              onClick={() => trocarAba(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Categorias */}
        <div style={s.field}>
          <label style={s.label}>Categoria</label>
          <div style={s.catGrid}>
            {catsDaAba.length === 0 && (
              <span style={{ color:"#475569", fontSize:13 }}>Nenhuma categoria cadastrada.</span>
            )}
            {catsDaAba.map(c => (
              <button
                key={c.id}
                style={{
                  ...s.catBtn,
                  background: form.categoria_id === c.id ? tipoAtivo.cor : "#1e1e2e",
                  color:      form.categoria_id === c.id ? "#fff" : "#94a3b8",
                  border:     `1px solid ${form.categoria_id === c.id ? tipoAtivo.cor : "#2a2a3e"}`,
                  transform:  form.categoria_id === c.id ? "scale(1.04)" : "scale(1)",
                }}
                onClick={() => set("categoria_id", c.id)}
              >
                {c.nome}
              </button>
            ))}
          </div>
        </div>

        {/* Meio de pagamento */}
        <div style={s.field}>
          <label style={s.label}>Meio de pagamento</label>
          <div style={s.meioRow}>
            {MEIOS.map(m => (
              <button
                key={m.value}
                style={{
                  ...s.meioBtn,
                  background: form.meio_pagamento === m.value ? "#7c3aed" : "#1e1e2e",
                  color:      form.meio_pagamento === m.value ? "#fff" : "#666",
                  border:     `1px solid ${form.meio_pagamento === m.value ? "#7c3aed" : "#2a2a3e"}`,
                }}
                onClick={() => set("meio_pagamento", m.value)}
              >
                <span>{m.icon}</span>
                <span style={{ fontSize:11 }}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cartão */}
        {form.meio_pagamento === "cartao" && (
          <div style={s.field}>
            <label style={s.label}>Cartão</label>
            <select style={s.input} value={form.cartao_id} onChange={e => set("cartao_id", e.target.value)}>
              {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        )}

        {/* Parcelamento */}
        {form.meio_pagamento === "cartao" && (
          <div style={s.field}>
            <div style={s.toggleRow}>
              <span style={s.toggleLabel}>Compra parcelada?</span>
              <button
                style={{ ...s.toggleBtn, background: form.parcelado ? "#7c3aed" : "#1e1e2e", color: form.parcelado ? "#fff" : "#475569" }}
                onClick={() => set("parcelado", !form.parcelado)}
              >
                {form.parcelado ? "Sim" : "Não"}
              </button>
            </div>
          </div>
        )}

        {form.meio_pagamento === "cartao" && form.parcelado && (
          <div style={s.field}>
            <label style={s.label}>Número de parcelas</label>
            <div style={s.parcelasGrid}>
              {[2,3,4,5,6,7,8,10,12,18,24].map(n => (
                <button
                  key={n}
                  style={{
                    ...s.parcelaOpcao,
                    background: form.num_parcelas === String(n) ? "#7c3aed" : "#1e1e2e",
                    color:      form.num_parcelas === String(n) ? "#fff" : "#475569",
                    border:     `1px solid ${form.num_parcelas === String(n) ? "#7c3aed" : "#2a2a3e"}`,
                  }}
                  onClick={() => set("num_parcelas", String(n))}
                >
                  {n}x
                </button>
              ))}
            </div>
            {/* Preview parcelas */}
            {valorFloat > 0 && (
              <div style={s.previewParcelas}>
                <div style={{ padding:"8px 12px", borderBottom:"1px solid #1e1e2e", fontSize:11, color:"#475569" }}>
                  {form.num_parcelas}x de R$ {(valorFloat / parseInt(form.num_parcelas)).toFixed(2).replace(".",",")}
                </div>
                <div style={{ maxHeight:120, overflowY:"auto" }}>
                  {gerarParcelas().map(p => (
                    <div key={p.num} style={s.previewLinha}>
                      <span style={s.previewNum}>{p.num}/{p.total}</span>
                      <span style={s.previewMes}>{meses[p.mes-1]}/{p.ano}</span>
                      <span style={s.previewValor}>R$ {p.valor.toFixed(2).replace(".",",")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {form.meio_pagamento === "cartao" && !form.parcelado && (
          <div style={s.field}>
            <label style={s.label}>Mês da fatura</label>
            <div style={{ display:"flex", gap:8 }}>
              <select style={{ ...s.input, flex:2 }} value={form.mes_fatura} onChange={e => set("mes_fatura", e.target.value)}>
                {meses.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
              <input style={{ ...s.input, flex:1, textAlign:"center" }} type="number" value={form.ano_fatura} onChange={e => set("ano_fatura", e.target.value)} />
            </div>
          </div>
        )}

        {form.meio_pagamento === "cartao" && form.parcelado && (
          <div style={s.field}>
            <label style={s.label}>Mês da 1ª parcela</label>
            <div style={{ display:"flex", gap:8 }}>
              <select style={{ ...s.input, flex:2 }} value={form.mes_fatura} onChange={e => set("mes_fatura", e.target.value)}>
                {meses.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
              <input style={{ ...s.input, flex:1, textAlign:"center" }} type="number" value={form.ano_fatura} onChange={e => set("ano_fatura", e.target.value)} />
            </div>
          </div>
        )}

        {/* Descrição */}
        <div style={s.field}>
          <label style={s.label}>Descrição <span style={{ color:"#334155" }}>(opcional)</span></label>
          <input
            style={s.input}
            placeholder="Ex: Mercado, Uber, Netflix..."
            value={form.descricao}
            onChange={e => set("descricao", e.target.value)}
          />
        </div>

        {/* Data */}
        <div style={s.field}>
          <label style={s.label}>Data</label>
          <input style={s.input} type="date" value={form.data} onChange={e => set("data", e.target.value)} />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button
          style={{ ...s.btn, background: tipoAtivo.cor, ...(saving ? s.btnDisabled : {}) }}
          onClick={salvar}
          disabled={saving}
          className="btn-salvar"
        >
          {saving ? "Salvando..." : success ? "✓ Salvo!" : `Lançar ${valorFloat > 0 ? "R$ " + valorFloat.toFixed(2).replace(".",",") : ""}`}
        </button>

      </div>

      {success && (
        <div style={{ ...s.toast, background: tipoAtivo.cor }}>
          ✓ Lançamento salvo!
        </div>
      )}
    </div>
  );
}

const s = {
  screen: {
    minHeight:"100dvh", background:"#0d0d1a",
    display:"flex", flexDirection:"column", alignItems:"center",
    fontFamily:"'DM Sans', sans-serif", paddingBottom:40,
  },
  loader:    { display:"flex", alignItems:"center", justifyContent:"center", height:"100dvh" },
  loaderDot: { width:12, height:12, borderRadius:"50%", background:"#7c3aed", animation:"pulse 1s infinite" },
  header: {
    width:"100%", maxWidth:480,
    display:"flex", justifyContent:"space-between", alignItems:"center",
    padding:"20px 24px 0", boxSizing:"border-box",
  },
  headerLabel: { color:"#7c3aed", fontWeight:700, fontSize:15, letterSpacing:1, textTransform:"uppercase" },
  headerDate:  { color:"#555", fontSize:13 },
  valorBlock: {
    display:"flex", alignItems:"baseline", gap:8,
    padding:"32px 24px 16px",
    width:"100%", maxWidth:480, boxSizing:"border-box",
  },
  cifrao:     { color:"#7c3aed", fontSize:28, fontWeight:700 },
  valorInput: {
    background:"transparent", border:"none", outline:"none",
    color:"#fff", fontSize:52, fontWeight:800, width:"100%",
    fontFamily:"'DM Sans', sans-serif", letterSpacing:-2,
  },
  card: {
    width:"100%", maxWidth:480,
    background:"#13131f", borderRadius:20,
    padding:"0 0 24px", boxSizing:"border-box", margin:"0 12px",
    display:"flex", flexDirection:"column", gap:20,
    border:"1px solid #1e1e2e", overflow:"hidden",
  },
  abas: { display:"flex", borderBottom:"1px solid #1e1e2e" },
  aba: {
    flex:1, padding:"14px 8px",
    background:"transparent", border:"none", borderBottom:"2px solid transparent",
    cursor:"pointer", fontSize:13, fontWeight:700,
    textTransform:"uppercase", letterSpacing:0.8, transition:"all 0.15s",
  },
  field:  { display:"flex", flexDirection:"column", gap:8, padding:"0 20px" },
  label:  { color:"#666", fontSize:12, fontWeight:600, textTransform:"uppercase", letterSpacing:1 },
  catGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(90px, 1fr))", gap:8 },
  catBtn: { padding:"10px 8px", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:600, transition:"all 0.15s", lineHeight:1.3 },
  meioRow: { display:"flex", gap:6, flexWrap:"wrap" },
  meioBtn: {
    padding:"8px 10px", borderRadius:10, cursor:"pointer",
    display:"flex", flexDirection:"column", alignItems:"center", gap:3,
    fontSize:16, minWidth:52, transition:"all 0.15s",
  },
  input: {
    background:"#1e1e2e", border:"1px solid #2a2a3e", borderRadius:10,
    color:"#ccc", padding:"12px 14px", fontSize:14, outline:"none",
    width:"100%", boxSizing:"border-box", fontFamily:"'DM Sans', sans-serif",
  },
  btn: {
    color:"#fff", border:"none", borderRadius:14, padding:"16px",
    fontSize:16, fontWeight:700, cursor:"pointer",
    width:"calc(100% - 40px)", margin:"0 20px",
    fontFamily:"'DM Sans', sans-serif", letterSpacing:0.3, transition:"all 0.2s",
  },
  btnDisabled: { opacity:0.6, cursor:"not-allowed" },
  toggleRow:    { display:"flex", justifyContent:"space-between", alignItems:"center", background:"#1a1a2e", borderRadius:10, padding:"10px 14px" },
  toggleLabel:  { fontSize:13, fontWeight:600, color:"#94a3b8" },
  toggleBtn:    { border:"none", borderRadius:8, padding:"6px 16px", fontSize:13, fontWeight:700, cursor:"pointer", transition:"all 0.15s" },
  parcelasGrid: { display:"flex", flexWrap:"wrap", gap:6 },
  parcelaOpcao: { padding:"6px 12px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:700, transition:"all 0.15s" },
  previewParcelas: { background:"#1a1a2e", borderRadius:10, overflow:"hidden", marginTop:4 },
  previewLinha: { display:"flex", alignItems:"center", gap:10, padding:"6px 12px", borderBottom:"1px solid #1e1e2e" },
  previewNum:   { fontSize:11, color:"#475569", minWidth:32 },
  previewMes:   { fontSize:12, color:"#94a3b8", flex:1 },
  previewValor: { fontSize:12, fontWeight:700, color:"#7c3aed" },
  error: { color:"#ef4444", fontSize:13, margin:"0 20px", background:"#1a0a0a", borderRadius:8, padding:"10px 14px" },
  toast: {
    position:"fixed", bottom:32, left:"50%", transform:"translateX(-50%)",
    color:"#fff", padding:"12px 24px", borderRadius:40,
    fontWeight:700, fontSize:14, boxShadow:"0 4px 20px rgba(0,0,0,0.4)",
    animation:"slideUp 0.3s ease",
  },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d0d1a; }
  input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.4); }
  select option { background: #1e1e2e; color: #ccc; }
  .btn-salvar:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
  .btn-salvar:active:not(:disabled) { transform: translateY(0); }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes slideUp { from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
`;
