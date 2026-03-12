import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const TIPOS_CATEGORIA = [
  { value: "receita",          label: "Receita",           cor: "#22c55e" },
  { value: "despesa_fixa",     label: "Despesa Fixa",      cor: "#f97316" },
  { value: "despesa_variavel", label: "Despesa Variável",  cor: "#3b82f6" },
];

// ── Modal genérico ───────────────────────────────────────────────
function Modal({ titulo, onFechar, children }) {
  return (
    <div style={s.overlay} onClick={onFechar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <span style={s.modalTitulo}>{titulo}</span>
          <button style={s.modalFechar} onClick={onFechar}>✕</button>
        </div>
        <div style={s.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ── Seção de Categorias ──────────────────────────────────────────
function SecaoCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null); // null | { modo: 'novo' | 'editar', item? }
  const [form, setForm]             = useState({ nome: "", tipo: "despesa_variavel" });
  const [saving, setSaving]         = useState(false);
  const [erro, setErro]             = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState(true);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function carregar() {
    setLoading(true);
    const data = await fetch(`${API_URL}/categorias/`).then(r => r.json());
    setCategorias(data);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setForm({ nome: "", tipo: "despesa_variavel" });
    setErro("");
    setModal({ modo: "novo" });
  }

  function abrirEditar(cat) {
    setForm({ nome: cat.nome, tipo: cat.tipo });
    setErro("");
    setModal({ modo: "editar", item: cat });
  }

  async function salvar() {
    if (!form.nome.trim()) { setErro("Informe o nome."); return; }
    setSaving(true); setErro("");
    try {
      if (modal.modo === "novo") {
        const res = await fetch(`${API_URL}/categorias/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: form.nome.trim(), tipo: form.tipo }),
        });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch(`${API_URL}/categorias/${modal.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: form.nome.trim(), tipo: form.tipo }),
        });
        if (!res.ok) throw new Error();
      }
      setModal(null);
      carregar();
    } catch { setErro("Erro ao salvar. Verifique se o nome já existe."); }
    finally  { setSaving(false); }
  }

  async function toggleAtivo(cat) {
    await fetch(`${API_URL}/categorias/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !cat.ativo }),
    });
    carregar();
  }

  const filtradas = categorias.filter(c => c.ativo === filtroAtivo);
  const porTipo   = TIPOS_CATEGORIA.map(t => ({
    ...t,
    itens: filtradas.filter(c => c.tipo === t.value),
  }));

  return (
    <div style={s.secao}>
      {/* Cabeçalho */}
      <div style={s.secaoHeader}>
        <div>
          <div style={s.secaoTitulo}>Categorias</div>
          <div style={s.secaoSub}>{categorias.filter(c => c.ativo).length} ativas</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={s.filtroRow}>
            <button style={{ ...s.filtroBotao, ...(filtroAtivo ? s.filtroBotaoAtivo : {}) }} onClick={() => setFiltroAtivo(true)}>Ativas</button>
            <button style={{ ...s.filtroBotao, ...(!filtroAtivo ? s.filtroBotaoAtivo : {}) }} onClick={() => setFiltroAtivo(false)}>Inativas</button>
          </div>
          <button style={s.btnPrimario} onClick={abrirNovo}>+ Nova</button>
        </div>
      </div>

      {/* Lista por tipo */}
      {loading ? (
        <div style={s.loadingWrap}><div style={s.spinner} /></div>
      ) : (
        <div style={s.listaGrupos}>
          {porTipo.map(tipo => (
            tipo.itens.length === 0 ? null : (
              <div key={tipo.value} style={s.grupo}>
                <div style={{ ...s.grupoHeader, borderLeftColor: tipo.cor }}>
                  <span style={{ ...s.grupoTag, background: tipo.cor + "22", color: tipo.cor }}>{tipo.label}</span>
                  <span style={s.grupoCount}>{tipo.itens.length}</span>
                </div>
                {tipo.itens.map(cat => (
                  <div key={cat.id} style={{ ...s.linhaItem, opacity: cat.ativo ? 1 : 0.5 }}>
                    <span style={s.itemNome}>{cat.nome}</span>
                    <div style={s.itemAcoes}>
                      <button style={s.btnAcao} onClick={() => abrirEditar(cat)} title="Editar">✏️</button>
                      <button
                        style={{ ...s.btnAcao, color: cat.ativo ? "#ef4444" : "#22c55e" }}
                        onClick={() => toggleAtivo(cat)}
                        title={cat.ativo ? "Desativar" : "Reativar"}
                      >
                        {cat.ativo ? "🚫" : "✓"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ))}
          {filtradas.length === 0 && (
            <div style={s.vazio}>
              <span style={{ color: "#94a3b8" }}>{filtroAtivo ? "Nenhuma categoria ativa." : "Nenhuma categoria inativa."}</span>
            </div>
          )}
        </div>
      )}

      {/* Modal novo/editar */}
      {modal && (
        <Modal
          titulo={modal.modo === "novo" ? "Nova Categoria" : "Editar Categoria"}
          onFechar={() => setModal(null)}
        >
          <div style={s.formField}>
            <label style={s.formLabel}>Nome *</label>
            <input
              style={s.formInput}
              placeholder="Ex: Academia"
              value={form.nome}
              onChange={e => set("nome", e.target.value)}
              autoFocus
            />
          </div>
          <div style={s.formField}>
            <label style={s.formLabel}>Tipo *</label>
            <div style={s.tipoGrid}>
              {TIPOS_CATEGORIA.map(t => (
                <button
                  key={t.value}
                  style={{
                    ...s.tipoBotao,
                    background: form.tipo === t.value ? t.cor + "22" : "#1e293b",
                    color:      form.tipo === t.value ? t.cor : "#94a3b8",
                    border:     `1px solid ${form.tipo === t.value ? t.cor : "#7c8fa8"}`,
                  }}
                  onClick={() => set("tipo", t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {erro && <div style={s.erro}>{erro}</div>}
          <button style={s.btnSalvarModal} onClick={salvar} disabled={saving}>
            {saving ? "Salvando..." : modal.modo === "novo" ? "Cadastrar" : "Salvar alterações"}
          </button>
        </Modal>
      )}
    </div>
  );
}

// ── Seção de Cartões ─────────────────────────────────────────────
function SecaoCartoes() {
  const [cartoes, setCartoes]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState({ nome: "", bandeira: "", dia_fechamento: "", dia_vencimento: "" });
  const [saving, setSaving]     = useState(false);
  const [erro, setErro]         = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState(true);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function carregar() {
    setLoading(true);
    const data = await fetch(`${API_URL}/cartoes/`).then(r => r.json());
    setCartoes(data);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setForm({ nome: "", bandeira: "", dia_fechamento: "", dia_vencimento: "" });
    setErro("");
    setModal({ modo: "novo" });
  }

  function abrirEditar(c) {
    setForm({
      nome:            c.nome,
      bandeira:        c.bandeira || "",
      dia_fechamento:  c.dia_fechamento || "",
      dia_vencimento:  c.dia_vencimento || "",
    });
    setErro("");
    setModal({ modo: "editar", item: c });
  }

  async function salvar() {
    if (!form.nome.trim()) { setErro("Informe o nome do cartão."); return; }
    setSaving(true); setErro("");
    const payload = {
      nome:           form.nome.trim(),
      bandeira:       form.bandeira || null,
      dia_fechamento: form.dia_fechamento ? parseInt(form.dia_fechamento) : null,
      dia_vencimento: form.dia_vencimento ? parseInt(form.dia_vencimento) : null,
    };
    try {
      if (modal.modo === "novo") {
        const res = await fetch(`${API_URL}/cartoes/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch(`${API_URL}/cartoes/${modal.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
      }
      setModal(null);
      carregar();
    } catch { setErro("Erro ao salvar."); }
    finally  { setSaving(false); }
  }

  async function toggleAtivo(cartao) {
    await fetch(`${API_URL}/cartoes/${cartao.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !cartao.ativo }),
    });
    carregar();
  }

  const filtrados = cartoes.filter(c => c.ativo === filtroAtivo);

  return (
    <div style={s.secao}>
      <div style={s.secaoHeader}>
        <div>
          <div style={s.secaoTitulo}>Cartões de Crédito</div>
          <div style={s.secaoSub}>{cartoes.filter(c => c.ativo).length} ativos</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={s.filtroRow}>
            <button style={{ ...s.filtroBotao, ...(filtroAtivo ? s.filtroBotaoAtivo : {}) }} onClick={() => setFiltroAtivo(true)}>Ativos</button>
            <button style={{ ...s.filtroBotao, ...(!filtroAtivo ? s.filtroBotaoAtivo : {}) }} onClick={() => setFiltroAtivo(false)}>Inativos</button>
          </div>
          <button style={s.btnPrimario} onClick={abrirNovo}>+ Novo</button>
        </div>
      </div>

      {loading ? (
        <div style={s.loadingWrap}><div style={s.spinner} /></div>
      ) : (
        <div style={s.listaSimples}>
          {filtrados.length === 0 && (
            <div style={s.vazio}>
              <span style={{ color: "#94a3b8" }}>{filtroAtivo ? "Nenhum cartão ativo." : "Nenhum cartão inativo."}</span>
            </div>
          )}
          {filtrados.map(c => (
            <div key={c.id} style={{ ...s.linhaItem, opacity: c.ativo ? 1 : 0.5 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={s.itemNome}>💳 {c.nome}</span>
                <div style={s.itemMeta}>
                  {c.bandeira && <span>{c.bandeira}</span>}
                  {c.dia_fechamento && <span>Fecha dia {c.dia_fechamento}</span>}
                  {c.dia_vencimento && <span>Vence dia {c.dia_vencimento}</span>}
                </div>
              </div>
              <div style={s.itemAcoes}>
                <button style={s.btnAcao} onClick={() => abrirEditar(c)} title="Editar">✏️</button>
                <button
                  style={{ ...s.btnAcao, color: c.ativo ? "#ef4444" : "#22c55e" }}
                  onClick={() => toggleAtivo(c)}
                  title={c.ativo ? "Desativar" : "Reativar"}
                >
                  {c.ativo ? "🚫" : "✓"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          titulo={modal.modo === "novo" ? "Novo Cartão" : "Editar Cartão"}
          onFechar={() => setModal(null)}
        >
          <div style={s.formField}>
            <label style={s.formLabel}>Nome do cartão *</label>
            <input style={s.formInput} placeholder="Ex: Nubank" value={form.nome} onChange={e => set("nome", e.target.value)} autoFocus />
          </div>
          <div style={s.formField}>
            <label style={s.formLabel}>Bandeira</label>
            <input style={s.formInput} placeholder="Ex: Mastercard, Visa..." value={form.bandeira} onChange={e => set("bandeira", e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ ...s.formField, flex: 1 }}>
              <label style={s.formLabel}>Dia fechamento</label>
              <input style={s.formInput} inputMode="numeric" placeholder="Ex: 15" value={form.dia_fechamento} onChange={e => set("dia_fechamento", e.target.value)} />
            </div>
            <div style={{ ...s.formField, flex: 1 }}>
              <label style={s.formLabel}>Dia vencimento</label>
              <input style={s.formInput} inputMode="numeric" placeholder="Ex: 22" value={form.dia_vencimento} onChange={e => set("dia_vencimento", e.target.value)} />
            </div>
          </div>
          {erro && <div style={s.erro}>{erro}</div>}
          <button style={s.btnSalvarModal} onClick={salvar} disabled={saving}>
            {saving ? "Salvando..." : modal.modo === "novo" ? "Cadastrar" : "Salvar alterações"}
          </button>
        </Modal>
      )}
    </div>
  );
}

// ── Tela principal ───────────────────────────────────────────────
export default function Cadastros() {
  return (
    <div style={s.page}>
      <style>{css}</style>
      <div style={s.topbar}>
        <div>
          <div style={s.topbarTitle}>Cadastros</div>
          <div style={s.topbarSub}>Finança Familiar</div>
        </div>
      </div>
      <div style={s.body}>
        <SecaoCategorias />
        <SecaoCartoes />
      </div>
    </div>
  );
}

const s = {
  page:       { minHeight: "100vh", background: "#080f1a", fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0", paddingBottom: 80 },
  topbar:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", borderBottom: "1px solid #1e293b", background: "#080f1acc", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 },
  topbarTitle:{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 },
  topbarSub:  { fontSize: 11, color: "#94a3b8", marginTop: 2, letterSpacing: 1, textTransform: "uppercase" },
  body:       { display: "flex", flexDirection: "column", gap: 24, padding: "20px", maxWidth: 700, margin: "0 auto" },
  secao:      { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" },
  secaoHeader:{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #1e293b", background: "#0f172a", flexWrap: "wrap", gap: 10 },
  secaoTitulo:{ fontSize: 16, fontWeight: 800 },
  secaoSub:   { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  filtroRow:  { display: "flex", gap: 4 },
  filtroBotao:{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#94a3b8", padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  filtroBotaoAtivo: { background: "#1e293b", color: "#e2e8f0", borderColor: "#7c8fa8" },
  btnPrimario:{ background: "#1d4ed8", border: "none", borderRadius: 10, color: "#fff", padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  loadingWrap:{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 },
  spinner:    { width: 24, height: 24, borderRadius: "50%", border: "3px solid #1e293b", borderTopColor: "#3b82f6", animation: "spin 0.8s linear infinite" },
  listaGrupos:{ display: "flex", flexDirection: "column" },
  listaSimples:{ display: "flex", flexDirection: "column" },
  grupo:      { borderBottom: "1px solid #0f172a" },
  grupoHeader:{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", background: "#0c1420", borderLeft: "3px solid" },
  grupoTag:   { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, padding: "3px 10px", borderRadius: 6 },
  grupoCount: { fontSize: 12, color: "#94a3b8", fontWeight: 600 },
  linhaItem:  { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #0f172a", transition: "background 0.15s" },
  itemNome:   { fontSize: 14, fontWeight: 600, color: "#cbd5e1" },
  itemMeta:   { display: "flex", gap: 10, fontSize: 11, color: "#94a3b8", marginTop: 2, flexWrap: "wrap" },
  itemAcoes:  { display: "flex", gap: 4 },
  btnAcao:    { background: "none", border: "none", fontSize: 16, cursor: "pointer", padding: "4px 6px", borderRadius: 6 },
  vazio:      { padding: "32px 20px", textAlign: "center" },
  overlay:    { position: "fixed", inset: 0, background: "#000000bb", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  modal:      { background: "#0f172a", border: "1px solid #1e293b", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "90dvh", overflowY: "auto" },
  modalHeader:{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 20px 0", position: "sticky", top: 0, background: "#0f172a" },
  modalTitulo:{ fontSize: 18, fontWeight: 800 },
  modalFechar:{ background: "none", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" },
  modalBody:  { padding: "20px", display: "flex", flexDirection: "column", gap: 16 },
  formField:  { display: "flex", flexDirection: "column", gap: 6 },
  formLabel:  { fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 },
  formInput:  { background: "#1e293b", border: "1px solid #334155", borderRadius: 10, color: "#e2e8f0", padding: "12px 14px", fontSize: 14, outline: "none", fontFamily: "'DM Sans', sans-serif" },
  tipoGrid:   { display: "flex", flexDirection: "column", gap: 8 },
  tipoBotao:  { padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, textAlign: "left", transition: "all 0.15s" },
  btnSalvarModal: { background: "#1d4ed8", border: "none", borderRadius: 12, color: "#fff", padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  erro:       { color: "#ef4444", fontSize: 13, background: "#1a0a0a", borderRadius: 8, padding: "10px 14px" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080f1a; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
