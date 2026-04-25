import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function fmtBRL(v) {
  return (parseFloat(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(d) {
  if (!d) return "—";
  const [ano, mes, dia] = d.split("-");
  return `${dia}/${mes}/${ano}`;
}

// ── Modal: Novo lançamento manual ────────────────────────────────
function ModalNovoLancamento({ cartoes, categorias, mes, ano, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    descricao: "", valor: "", categoria_id: categorias[0]?.id || "",
    cartao_id: cartoes[0]?.id || "", data: new Date().toISOString().slice(0,10),
    mes_fatura: mes, ano_fatura: ano,
    parcelado: false, num_parcelas: "2",
  });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Gera lista de parcelas para preview
  function calcularFaturaCartao() {
    const cartao = cartoes.find(c => c.id === form.cartao_id);
    if (!cartao?.dia_fechamento) {
      return { mes: parseInt(form.mes_fatura), ano: parseInt(form.ano_fatura) };
    }
    const [anoCompra, mesCompra, diaCompra] = form.data.split("-").map(Number);
    let mesFatura = mesCompra;
    let anoFatura = anoCompra;
    if (diaCompra > cartao.dia_fechamento) {
      mesFatura += 1;
      if (mesFatura > 12) {
        mesFatura = 1;
        anoFatura += 1;
      }
    }
    return { mes: mesFatura, ano: anoFatura };
  }

  function gerarParcelas() {
    const total    = parseFloat(form.valor.replace(",",".")) || 0;
    const n        = parseInt(form.num_parcelas) || 1;
    const valorParcela = parseFloat((total / n).toFixed(2));
    const parcelas = [];
    const fatura = calcularFaturaCartao();
    let m = fatura.mes;
    let a = fatura.ano;
    for (let i = 0; i < n; i++) {
      parcelas.push({ mes: m, ano: a, valor: valorParcela, num: i + 1 });
      m++;
      if (m > 12) { m = 1; a++; }
    }
    return parcelas;
  }

  async function salvar() {
    if (!form.descricao)    { setErro("Informe a descrição."); return; }
    if (!form.valor)        { setErro("Informe o valor."); return; }
    if (!form.categoria_id) { setErro("Selecione a categoria."); return; }
    setSaving(true); setErro("");
    try {
      if (form.parcelado) {
        const parcelas = gerarParcelas();
        const n = parcelas.length;
        for (const p of parcelas) {
          await onSalvar({
            descricao:      `${form.descricao} (${p.num}/${n})`,
            valor:          p.valor,
            categoria_id:   form.categoria_id,
            cartao_id:      form.cartao_id,
            data:           form.data,
            meio_pagamento: "cartao",
            mes_fatura:     p.mes,
            ano_fatura:     p.ano,
          });
        }
      } else {
        const fatura = calcularFaturaCartao();
        await onSalvar({
          descricao:      form.descricao,
          valor:          parseFloat(form.valor.replace(",",".")),
          categoria_id:   form.categoria_id,
          cartao_id:      form.cartao_id,
          data:           form.data,
          meio_pagamento: "cartao",
          mes_fatura:     fatura.mes,
          ano_fatura:     fatura.ano,
        });
      }
    } catch { setErro("Erro ao salvar."); }
    finally  { setSaving(false); }
  }

  const mesesOpts  = MESES.map((m, i) => ({ label: m, value: i + 1 }));
  const parcelas   = form.parcelado && form.valor && form.num_parcelas ? gerarParcelas() : [];
  const valorParc  = parcelas[0]?.valor || 0;

  return (
    <div style={s.overlay} onClick={onFechar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <span style={s.modalTitulo}>Novo Lançamento</span>
          <button style={s.modalFechar} onClick={onFechar}>✕</button>
        </div>
        <div style={s.modalBody}>
          <div style={s.formField}>
            <label style={s.formLabel}>Descrição *</label>
            <input style={s.formInput} placeholder="Ex: Tênis Nike" value={form.descricao} onChange={e => set("descricao", e.target.value)} />
          </div>
          <div style={s.formField}>
            <label style={s.formLabel}>Valor total (R$) *</label>
            <input style={s.formInput} inputMode="decimal" placeholder="Ex: 450,00" value={form.valor} onChange={e => set("valor", e.target.value)} />
          </div>

          {/* Toggle parcelado */}
          <div style={s.toggleRow}>
            <span style={s.toggleLabel}>Compra parcelada?</span>
            <button
              style={{ ...s.toggleBtn, background: form.parcelado ? "#1d4ed8" : "#1e293b", color: form.parcelado ? "#fff" : "#94a3b8" }}
              onClick={() => set("parcelado", !form.parcelado)}
            >
              {form.parcelado ? "Sim" : "Não"}
            </button>
          </div>

          {/* Campos de parcelamento */}
          {form.parcelado && (
            <>
              <div style={s.formField}>
                <label style={s.formLabel}>Número de parcelas *</label>
                <div style={s.parcelasGrid}>
                  {[2,3,4,5,6,7,8,10,12,18,24].map(n => (
                    <button
                      key={n}
                      style={{
                        ...s.parcelaOpcao,
                        background: form.num_parcelas === String(n) ? "#1d4ed8" : "#1e293b",
                        color:      form.num_parcelas === String(n) ? "#fff" : "#94a3b8",
                        border:     `1px solid ${form.num_parcelas === String(n) ? "#1d4ed8" : "#7c8fa8"}`,
                      }}
                      onClick={() => set("num_parcelas", String(n))}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview das parcelas */}
              {parcelas.length > 0 && (
                <div style={s.previewParcelas}>
                  <div style={s.previewHeader}>
                    <span style={s.formLabel}>Preview — {parcelas.length}x de {fmtBRL(valorParc)}</span>
                  </div>
                  <div style={s.previewLista}>
                    {parcelas.map(p => (
                      <div key={p.num} style={s.previewLinha}>
                        <span style={s.previewNum}>{p.num}/{parcelas.length}</span>
                        <span style={s.previewMes}>{MESES[p.mes-1].slice(0,3)}/{p.ano}</span>
                        <span style={s.previewValor}>{fmtBRL(p.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div style={s.formField}>
            <label style={s.formLabel}>Categoria *</label>
            <select style={s.formInput} value={form.categoria_id} onChange={e => set("categoria_id", e.target.value)}>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div style={s.formField}>
            <label style={s.formLabel}>Cartão *</label>
            <select style={s.formInput} value={form.cartao_id} onChange={e => set("cartao_id", e.target.value)}>
              {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ ...s.formField, flex: 1 }}>
              <label style={s.formLabel}>{form.parcelado ? "Mês 1ª parcela" : "Mês fatura"}</label>
              <select style={s.formInput} value={form.mes_fatura} onChange={e => set("mes_fatura", e.target.value)}>
                {mesesOpts.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div style={{ ...s.formField, flex: 1 }}>
              <label style={s.formLabel}>Ano</label>
              <input style={s.formInput} type="number" value={form.ano_fatura} onChange={e => set("ano_fatura", e.target.value)} />
            </div>
          </div>
          <div style={s.formField}>
            <label style={s.formLabel}>Data da compra</label>
            <input style={s.formInput} type="date" value={form.data} onChange={e => set("data", e.target.value)} />
          </div>
          {erro && <div style={s.erro}>{erro}</div>}
          <button style={s.btnSalvarModal} onClick={salvar} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Lançamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Importar CSV ──────────────────────────────────────────
function ModalImportar({ cartoes, categorias, mes, ano, existentes = [], onSalvar, onFechar }) {
  const [preview, setPreview]       = useState([]);
  const [colunas, setColunas]       = useState([]);
  const [colDesc, setColDesc]       = useState("");
  const [colVal, setColVal]         = useState("");
  const [cartaoId, setCartaoId]     = useState(cartoes[0]?.id || "");
  const [mesFatura, setMesFatura]   = useState(mes);
  const [anoFatura, setAnoFatura]   = useState(ano);
  const [linhas, setLinhas]         = useState([]);
  const [etapa, setEtapa]           = useState(1); // 1: upload, 2: mapear colunas, 3: categorizar
  const [saving, setSaving]         = useState(false);
  const [erro, setErro]             = useState("");
  const inputRef = useRef();

  function processarCSV(texto) {
    const linhasRaw = texto.split("\n").filter(l => l.trim());
    const separador = linhasRaw[0].includes(";") ? ";" : ",";
    const header = linhasRaw[0].split(separador).map(c => c.trim().replace(/"/g,""));
    const dados  = linhasRaw.slice(1).map(l =>
      l.split(separador).reduce((obj, val, i) => {
        obj[header[i]] = val.trim().replace(/"/g,"");
        return obj;
      }, {})
    );
    setColunas(header);
    setPreview(dados.slice(0, 3));
    setLinhas(dados);
    setColDesc(header[0]);
    setColVal(header[1]);
    setEtapa(2);
  }

  function handleArquivo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => processarCSV(ev.target.result);
    reader.readAsText(file, "latin1");
  }

  function mapearLinhas() {
    if (!colDesc || !colVal) { setErro("Selecione as colunas."); return; }
    const regras = JSON.parse(localStorage.getItem("regras_categorias_csv") || "{}");
    const mapeadas = linhas
      .map(l => {
        const desc = l[colDesc];
        const valStr = (l[colVal] || "").replace(/\./g,"").replace(",",".");
        const val = Math.abs(parseFloat(valStr));
        if (!desc || isNaN(val) || val <= 0) return null;
        const chaveRegra = Object.keys(regras).find(k => desc.toLowerCase().includes(k));
        const categoriaRegra = chaveRegra ? regras[chaveRegra] : "";
        const duplicado = existentes.some(e =>
          (e.descricao || "").trim().toLowerCase() === desc.trim().toLowerCase() &&
          Math.abs(parseFloat(e.valor || 0) - val) < 0.01
        );
        if (duplicado) return null;
        return { descricao: desc, valor: val, categoria_id: categoriaRegra || categorias[0]?.id || "", cartao_id: cartaoId };
      })
      .filter(Boolean);
    setLinhas(mapeadas);
    setEtapa(3);
    setErro("");
  }

  async function salvarTudo() {
    setSaving(true);
    try {
      const regras = JSON.parse(localStorage.getItem("regras_categorias_csv") || "{}");
      for (const l of linhas) {
        const chave = l.descricao.trim().toLowerCase().slice(0, 32);
        if (chave && l.categoria_id) regras[chave] = l.categoria_id;
        await onSalvar({
          ...l,
          data: new Date().toISOString().slice(0,10),
          meio_pagamento: "cartao",
          mes_fatura: parseInt(mesFatura),
          ano_fatura: parseInt(anoFatura),
        });
      }
      localStorage.setItem("regras_categorias_csv", JSON.stringify(regras));
      onFechar();
    } catch { setErro("Erro ao salvar alguns lançamentos."); }
    finally  { setSaving(false); }
  }

  return (
    <div style={s.overlay} onClick={onFechar}>
      <div style={{ ...s.modal, maxHeight: "92dvh" }} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <span style={s.modalTitulo}>Importar Fatura CSV</span>
          <button style={s.modalFechar} onClick={onFechar}>✕</button>
        </div>
        <div style={s.modalBody}>

          {/* Etapa 1: Upload */}
          {etapa === 1 && (
            <>
              <div style={s.formField}>
                <label style={s.formLabel}>Cartão</label>
                <select style={s.formInput} value={cartaoId} onChange={e => setCartaoId(e.target.value)}>
                  {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ ...s.formField, flex: 1 }}>
                  <label style={s.formLabel}>Mês fatura</label>
                  <select style={s.formInput} value={mesFatura} onChange={e => setMesFatura(e.target.value)}>
                    {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div style={{ ...s.formField, flex: 1 }}>
                  <label style={s.formLabel}>Ano</label>
                  <input style={s.formInput} type="number" value={anoFatura} onChange={e => setAnoFatura(e.target.value)} />
                </div>
              </div>
              <div
                style={s.dropzone}
                onClick={() => inputRef.current.click()}
              >
                <span style={{ fontSize: 32 }}>📄</span>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>Clique para selecionar o arquivo CSV</span>
                <input ref={inputRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleArquivo} />
              </div>
            </>
          )}

          {/* Etapa 2: Mapear colunas */}
          {etapa === 2 && (
            <>
              <div style={s.infoBox}>Prévia das primeiras linhas do arquivo:</div>
              <div style={{ overflowX: "auto" }}>
                <table style={s.tabelaPreview}>
                  <thead>
                    <tr>{colunas.map(c => <th key={c} style={s.thPreview}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.map((l, i) => (
                      <tr key={i}>{colunas.map(c => <td key={c} style={s.tdPreview}>{l[c]}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ ...s.formField, flex: 1 }}>
                  <label style={s.formLabel}>Coluna de DESCRIÇÃO</label>
                  <select style={s.formInput} value={colDesc} onChange={e => setColDesc(e.target.value)}>
                    {colunas.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ ...s.formField, flex: 1 }}>
                  <label style={s.formLabel}>Coluna de VALOR</label>
                  <select style={s.formInput} value={colVal} onChange={e => setColVal(e.target.value)}>
                    {colunas.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {erro && <div style={s.erro}>{erro}</div>}
              <button style={s.btnSalvarModal} onClick={mapearLinhas}>Continuar →</button>
            </>
          )}

          {/* Etapa 3: Categorizar */}
          {etapa === 3 && (
            <>
              <div style={s.infoBox}>{linhas.length} transações encontradas. Categorize abaixo:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                {linhas.map((l, i) => (
                  <div key={i} style={s.linhaCategorizacao}>
                    <div style={s.linhaCatInfo}>
                      <span style={s.linhaCatDesc}>{l.descricao}</span>
                      <span style={s.linhaCatValor}>{fmtBRL(l.valor)}</span>
                    </div>
                    <select
                      style={{ ...s.formInput, padding: "8px 10px", fontSize: 12 }}
                      value={l.categoria_id}
                      onChange={e => {
                        const novas = [...linhas];
                        novas[i] = { ...novas[i], categoria_id: e.target.value };
                        setLinhas(novas);
                      }}
                    >
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {erro && <div style={s.erro}>{erro}</div>}
              <button style={s.btnSalvarModal} onClick={salvarTudo} disabled={saving}>
                {saving ? "Importando..." : `Importar ${linhas.length} lançamentos`}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Tela principal ───────────────────────────────────────────────
export default function CartaoCredito() {
  const hoje = new Date();
  const [mes, setMes]           = useState(hoje.getMonth() + 1);
  const [ano, setAno]           = useState(hoje.getFullYear());
  const [cartoes, setCartoes]   = useState([]);
  const [categorias, setCats]   = useState([]);
  const [cartaoSel, setCartaoSel] = useState("todos");
  const [lancamentos, setLancs] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalNovo, setModalNovo]       = useState(false);
  const [modalImport, setModalImport]   = useState(false);
  const [deletando, setDeletando]       = useState(null);

  // Carrega cartões e categorias uma vez
  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/cartoes/?ativo=true`).then(r => r.json()),
      fetch(`${API_URL}/categorias/?ativo=true`).then(r => r.json()),
    ]).then(([cars, cats]) => {
      setCartoes(cars);
      setCats(cats);
    });
  }, []);

  const carregarLancamentos = useCallback(() => {
    setLoading(true);
    fetch(`${API_URL}/lancamentos/?mes=${mes}&ano=${ano}&meio_pagamento=cartao`)
      .then(r => r.json())
      .then(setLancs)
      .finally(() => setLoading(false));
  }, [mes, ano]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregarLancamentos(); }, [carregarLancamentos]);

  async function criarLancamento(payload) {
    const res = await fetch(`${API_URL}/lancamentos/`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error();
    setModalNovo(false);
    setModalImport(false);
    carregarLancamentos();
  }

  async function deletarLancamento(id) {
    setDeletando(id);
    await fetch(`${API_URL}/lancamentos/${id}`, { method: "DELETE" });
    setDeletando(null);
    carregarLancamentos();
  }

  const mesAnterior = () => { if (mes === 1) { setMes(12); setAno(a => a-1); } else setMes(m => m-1); };
  const mesProximo  = () => { if (mes === 12) { setMes(1); setAno(a => a+1); } else setMes(m => m+1); };

  // Filtra por cartão selecionado
  const lancsFiltrados = cartaoSel === "todos"
    ? lancamentos
    : lancamentos.filter(l => l.cartao_id === cartaoSel);

  // Agrupa por categoria para o resumo
  const porCategoria = lancsFiltrados.reduce((acc, l) => {
    const nome = l.categoria?.nome || "Sem categoria";
    acc[nome] = (acc[nome] || 0) + parseFloat(l.valor);
    return acc;
  }, {});

  const totalFatura = lancsFiltrados.reduce((s, l) => s + parseFloat(l.valor), 0);

  return (
    <div style={s.page}>
      <style>{css}</style>

      {/* Topbar */}
      <div style={s.topbar}>
        <div>
          <div style={s.topbarTitle}>Cartão de Crédito</div>
          <div style={s.topbarSub}>Finança Familiar</div>
        </div>
        <div style={s.topbarAcoes}>
          <div style={s.mesSelector}>
            <button style={s.navBtn} onClick={mesAnterior}>‹</button>
            <span style={s.mesLabel}>{MESES[mes-1]} {ano}</span>
            <button style={s.navBtn} onClick={mesProximo}>›</button>
          </div>
          <button style={s.btnSecundario} onClick={() => setModalImport(true)}>↑ Importar</button>
          <button style={s.btnPrimario}   onClick={() => setModalNovo(true)}>+ Lançamento</button>
        </div>
      </div>

      {/* Filtro por cartão */}
      {cartoes.length > 1 && (
        <div style={s.filtroCartoes}>
          <button
            style={{ ...s.filtroBotao, ...(cartaoSel === "todos" ? s.filtroBotaoAtivo : {}) }}
            onClick={() => setCartaoSel("todos")}
          >
            Todos os cartões
          </button>
          {cartoes.map(c => (
            <button
              key={c.id}
              style={{ ...s.filtroBotao, ...(cartaoSel === c.id ? s.filtroBotaoAtivo : {}) }}
              onClick={() => setCartaoSel(c.id)}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}

      <div style={s.body}>
        {loading ? (
          <div style={s.loadingWrap}><div style={s.spinner} /></div>
        ) : (
          <>
            {/* Resumo */}
            <div style={s.resumoCard}>
              <div style={s.resumoTotal}>
                <span style={s.resumoTotalLabel}>Total da fatura</span>
                <span style={s.resumoTotalValor}>{fmtBRL(totalFatura)}</span>
              </div>
              {Object.keys(porCategoria).length > 0 && (
                <div style={s.resumoCats}>
                  {Object.entries(porCategoria)
                    .sort((a, b) => b[1] - a[1])
                    .map(([nome, valor]) => (
                      <div key={nome} style={s.resumoCatLinha}>
                        <span style={s.resumoCatNome}>{nome}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                          <div style={s.barraFundoMini}>
                            <div style={{
                              ...s.barraPreenchidaMini,
                              width: `${totalFatura > 0 ? (valor / totalFatura) * 100 : 0}%`,
                            }} />
                          </div>
                          <span style={s.resumoCatValor}>{fmtBRL(valor)}</span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Lista de lançamentos */}
            {lancsFiltrados.length === 0 ? (
              <div style={s.vazio}>
                <span style={{ fontSize: 36 }}>💳</span>
                <span style={{ color: "#94a3b8", marginTop: 12 }}>
                  Nenhum lançamento em {MESES[mes-1]}/{ano}.
                </span>
              </div>
            ) : (
              <div style={s.listaCard}>
                <div style={s.listaHeader}>
                  <span style={s.listaHeaderTitulo}>{lancsFiltrados.length} lançamentos</span>
                </div>
                {lancsFiltrados
                  .sort((a, b) => new Date(b.data) - new Date(a.data))
                  .map(l => (
                    <div key={l.id} style={s.linhaLanc}>
                      <div style={s.linhaLancEsq}>
                        <span style={s.linhaLancDesc}>{l.descricao || "—"}</span>
                        <div style={s.linhaLancMeta}>
                          <span style={s.linhaLancCat}>{l.categoria?.nome || "—"}</span>
                          <span style={s.linhaLancSep}>·</span>
                          <span style={s.linhaLancData}>{fmtData(l.data)}</span>
                          {l.cartao && cartaoSel === "todos" && (
                            <>
                              <span style={s.linhaLancSep}>·</span>
                              <span style={s.linhaLancData}>{l.cartao.nome}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={s.linhaLancDir}>
                        <span style={s.linhaLancValor}>{fmtBRL(l.valor)}</span>
                        <button
                          style={s.btnDeletar}
                          onClick={() => deletarLancamento(l.id)}
                          disabled={deletando === l.id}
                          title="Remover lançamento"
                        >
                          {deletando === l.id ? "..." : "✕"}
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </>
        )}
      </div>

      {modalNovo && (
        <ModalNovoLancamento
          cartoes={cartoes} categorias={categorias}
          mes={mes} ano={ano}
          onSalvar={criarLancamento} onFechar={() => setModalNovo(false)}
        />
      )}
      {modalImport && (
        <ModalImportar
          cartoes={cartoes} categorias={categorias}
          existentes={lancamentos}
          mes={mes} ano={ano}
          onSalvar={criarLancamento} onFechar={() => setModalImport(false)}
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
  topbarTitle:  { fontSize: 20, fontWeight: 800, letterSpacing: -0.5 },
  topbarSub:    { fontSize: 11, color: "#94a3b8", marginTop: 2, letterSpacing: 1, textTransform: "uppercase" },
  topbarAcoes:  { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  mesSelector:  { display: "flex", alignItems: "center", gap: 4, background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b", padding: "4px 8px" },
  mesLabel:     { fontSize: 13, fontWeight: 700, minWidth: 130, textAlign: "center", color: "#cbd5e1" },
  navBtn:       { background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer", padding: "0 8px", lineHeight: 1, borderRadius: 6 },
  btnPrimario:  { background: "#1d4ed8", border: "none", borderRadius: 10, color: "#fff", padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  btnSecundario:{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, color: "#94a3b8", padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  filtroCartoes:{ display: "flex", gap: 6, padding: "12px 20px", flexWrap: "wrap", borderBottom: "1px solid #1e293b" },
  filtroBotao:  { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#94a3b8", padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  filtroBotaoAtivo: { background: "#1e293b", color: "#e2e8f0", borderColor: "#7c8fa8" },
  body:         { display: "flex", flexDirection: "column", gap: 16, padding: "20px", maxWidth: 800, margin: "0 auto" },
  loadingWrap:  { display: "flex", alignItems: "center", justifyContent: "center", padding: 80 },
  spinner:      { width: 32, height: 32, borderRadius: "50%", border: "3px solid #1e293b", borderTopColor: "#3b82f6", animation: "spin 0.8s linear infinite" },
  vazio:        { display: "flex", flexDirection: "column", alignItems: "center", padding: 60, textAlign: "center" },
  resumoCard:   { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" },
  resumoTotal:  { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #1e293b" },
  resumoTotalLabel: { fontSize: 12, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 },
  resumoTotalValor: { fontSize: 24, fontWeight: 800, color: "#e2e8f0" },
  resumoCats:   { padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 },
  resumoCatLinha: { display: "flex", alignItems: "center", gap: 12 },
  resumoCatNome:  { fontSize: 12, color: "#94a3b8", minWidth: 110, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  resumoCatValor: { fontSize: 12, fontWeight: 700, color: "#cbd5e1", minWidth: 80, textAlign: "right" },
  barraFundoMini: { flex: 1, height: 4, background: "#1e293b", borderRadius: 99, overflow: "hidden" },
  barraPreenchidaMini: { height: "100%", borderRadius: 99, background: "#3b82f6", transition: "width 0.5s ease" },
  listaCard:    { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" },
  listaHeader:  { padding: "12px 20px", borderBottom: "1px solid #1e293b" },
  listaHeaderTitulo: { fontSize: 12, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 },
  linhaLanc:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #0f172a", gap: 12 },
  linhaLancEsq: { display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 },
  linhaLancDesc:{ fontSize: 14, fontWeight: 600, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  linhaLancMeta:{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" },
  linhaLancCat: { fontSize: 11, color: "#3b82f6", fontWeight: 600 },
  linhaLancSep: { fontSize: 11, color: "#7c8fa8" },
  linhaLancData:{ fontSize: 11, color: "#94a3b8" },
  linhaLancDir: { display: "flex", alignItems: "center", gap: 8 },
  linhaLancValor: { fontSize: 14, fontWeight: 700, color: "#e2e8f0", whiteSpace: "nowrap" },
  btnDeletar:   { background: "none", border: "none", color: "#7c8fa8", fontSize: 14, cursor: "pointer", padding: "4px 6px", borderRadius: 6, transition: "color 0.15s" },
  overlay:      { position: "fixed", inset: 0, background: "#000000bb", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  modal:        { background: "#0f172a", border: "1px solid #1e293b", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 520, maxHeight: "90dvh", overflowY: "auto" },
  modalHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 20px 0", position: "sticky", top: 0, background: "#0f172a" },
  modalTitulo:  { fontSize: 18, fontWeight: 800 },
  modalFechar:  { background: "none", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" },
  modalBody:    { padding: "20px", display: "flex", flexDirection: "column", gap: 14 },
  formField:    { display: "flex", flexDirection: "column", gap: 6 },
  formLabel:    { fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 },
  formInput:    { background: "#1e293b", border: "1px solid #334155", borderRadius: 10, color: "#e2e8f0", padding: "12px 14px", fontSize: 14, outline: "none", fontFamily: "'DM Sans', sans-serif" },
  btnSalvarModal:{ background: "#1d4ed8", border: "none", borderRadius: 12, color: "#fff", padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  erro:         { color: "#ef4444", fontSize: 13, background: "#1a0a0a", borderRadius: 8, padding: "10px 14px" },
  infoBox:      { background: "#0c1a2e", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#60a5fa" },
  dropzone:     { border: "2px dashed #1e293b", borderRadius: 12, padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", transition: "border-color 0.2s" },
  tabelaPreview:{ width: "100%", borderCollapse: "collapse", fontSize: 11 },
  thPreview:    { padding: "6px 8px", background: "#1e293b", color: "#94a3b8", textAlign: "left", fontWeight: 700 },
  tdPreview:    { padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #0f172a" },
  linhaCategorizacao: { background: "#0f172a", borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 },
  linhaCatInfo: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  linhaCatDesc: { fontSize: 13, color: "#cbd5e1", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  linhaCatValor:{ fontSize: 13, fontWeight: 700, color: "#3b82f6", marginLeft: 8 },
  toggleRow:    { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", borderRadius: 10, padding: "12px 14px" },
  toggleLabel:  { fontSize: 13, fontWeight: 600, color: "#94a3b8" },
  toggleBtn:    { border: "none", borderRadius: 8, padding: "6px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" },
  parcelasGrid: { display: "flex", flexWrap: "wrap", gap: 6 },
  parcelaOpcao: { padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.15s" },
  previewParcelas: { background: "#0f172a", borderRadius: 10, overflow: "hidden" },
  previewHeader:{ padding: "10px 14px", borderBottom: "1px solid #1e293b" },
  previewLista: { maxHeight: 160, overflowY: "auto" },
  previewLinha: { display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: "1px solid #0d1525" },
  previewNum:   { fontSize: 11, color: "#94a3b8", minWidth: 36 },
  previewMes:   { fontSize: 12, color: "#94a3b8", flex: 1 },
  previewValor: { fontSize: 12, fontWeight: 700, color: "#3b82f6" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080f1a; }
  input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.4); }
  select option { background: #1e293b; color: #e2e8f0; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
