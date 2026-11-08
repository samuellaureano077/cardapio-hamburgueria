"use strict";

/* ==========================================================
   CONFIGURAÇÕES DA LOJA (comece por aqui)
   ========================================================== */
const CONFIG = {
  nome: "Fumaça & Pão",
  whatsapp: "5511900000000", // troque pelo seu número (DDI + DDD + número, só dígitos)
  telefone: "(11) 90000-0000", // como o número aparece no site
  endereco: "Rua dos Tropeiros, 482 – Vila Mariana, São Paulo – SP",
  taxaEntrega: 7.0, // em reais; use 0 para entrega grátis
  tempoEntrega: "35–50 min",
  tempoRetirada: "20 min",
  fusoHorario: "America/Sao_Paulo", // o status "aberto/fechado" usa o horário da loja

  // Dias da semana: 0 = domingo, 1 = segunda ... 6 = sábado. Use null para fechado.
  // Fecha depois da meia-noite? Pode: { abre: "18:00", fecha: "00:30" }.
  horario: {
    0: { abre: "18:00", fecha: "23:30" }, // domingo
    1: null, //                              segunda: fechado
    2: { abre: "18:00", fecha: "23:30" }, // terça
    3: { abre: "18:00", fecha: "23:30" }, // quarta
    4: { abre: "18:00", fecha: "23:30" }, // quinta
    5: { abre: "18:00", fecha: "00:30" }, // sexta
    6: { abre: "18:00", fecha: "00:30" }, // sábado
  },

  // Deixe vazio ("") para esconder o ícone da rede social
  redes: {
    instagram: "https://www.instagram.com/",
    facebook: "https://www.facebook.com/",
  },
};

/* ==========================================================
   Utilidades
   ========================================================== */
const $ = (seletor, base = document) => base.querySelector(seletor);
const $$ = (seletor, base = document) => Array.from(base.querySelectorAll(seletor));

const QTD_MAXIMA = 30;
const MINUTOS_NO_DIA = 24 * 60;
const NOMES_DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const CHAVE_CARRINHO = "fumaca-e-pao:carrinho";
const CHAVE_CLIENTE = "fumaca-e-pao:cliente";
const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)");

// Dinheiro: todas as contas são feitas em centavos (números inteiros)
// para não cair nos erros de arredondamento do JavaScript.
const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const emCentavos = (reais) => Math.round(Number(reais || 0) * 100);
const moeda = (centavos) => formatoMoeda.format(centavos / 100);
const taxaEmCentavos = () => emCentavos(CONFIG.taxaEntrega);
const textoTaxa = () => (taxaEmCentavos() > 0 ? moeda(taxaEmCentavos()) : "Grátis");
const numeroWhatsapp = () => String(CONFIG.whatsapp).replace(/\D/g, "");

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (texto) => String(texto ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Minúsculas e sem acento: "Pão" vira "pao" (usado na busca). */
const normalizar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const slug = (texto) => normalizar(texto).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

const icone = (nome) =>
  `<svg class="icone" aria-hidden="true" focusable="false"><use href="#i-${nome}"></use></svg>`;

/** Lê um valor digitado ("100", "100,50", "R$ 1.000") e devolve centavos, ou null. */
function lerValorEmCentavos(texto) {
  let limpo = String(texto).replace(/[^\d,.]/g, "");
  if (!limpo) return null;
  if (limpo.includes(",")) {
    limpo = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/\.\d{3}$/.test(limpo) || (limpo.match(/\./g) || []).length > 1) {
    limpo = limpo.replace(/\./g, ""); // "1.000" é mil, não um real
  }
  const valor = Number(limpo);
  return Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) : null;
}

function lerStorage(chave, padrao) {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : padrao;
  } catch {
    return padrao;
  }
}

function gravarStorage(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* navegação privada ou armazenamento cheio: segue sem salvar */
  }
}

function apagarStorage(chave) {
  try {
    localStorage.removeItem(chave);
  } catch {
    /* armazenamento bloqueado: não há o que apagar */
  }
}

/* ==========================================================
   Dados do cardápio (vêm de data.js)
   ========================================================== */
const ITENS = new Map(CARDAPIO.map((item) => [item.id, item]));
const ADICIONAIS = new Map(EXTRAS.map((extra) => [extra.id, extra]));
const CATEGORIAS_ATIVAS = CATEGORIAS.filter((cat) => CARDAPIO.some((item) => item.categoria === cat.id));
const INDICE_BUSCA = new Map(
  CARDAPIO.map((item) => {
    const categoria = CATEGORIAS.find((cat) => cat.id === item.categoria);
    const texto = [item.nome, item.descricao, categoria ? categoria.nome : "", ...(item.tags || [])].join(" ");
    return [item.id, normalizar(texto)];
  })
);

const extrasDoItem = (item) => (item.extras || []).map((id) => ADICIONAIS.get(id)).filter(Boolean);

/* ==========================================================
   Horário de funcionamento
   ========================================================== */

/** Dia da semana e minuto atual no fuso da loja. */
function agoraNaLoja() {
  try {
    const partes = new Intl.DateTimeFormat("en-US", {
      timeZone: CONFIG.fusoHorario,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const valor = (tipo) => partes.find((p) => p.type === tipo).value;
    const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(valor("weekday"));
    const minutos = (Number(valor("hour")) % 24) * 60 + Number(valor("minute"));
    if (dia >= 0 && Number.isFinite(minutos)) return { dia, minutos };
  } catch {
    /* fuso inválido ou navegador antigo: usa o relógio do aparelho */
  }
  const agora = new Date();
  return { dia: agora.getDay(), minutos: agora.getHours() * 60 + agora.getMinutes() };
}

const paraMinutos = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + (m || 0);
};

/** 1080 vira "18h"; 1410 vira "23h30". */
function formatarHora(minutos) {
  const total = minutos % MINUTOS_NO_DIA;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** Turno de um dia em minutos. Se fecha depois da meia-noite, "fecha" passa de 1440. */
function turnoDoDia(dia) {
  const turno = CONFIG.horario[dia];
  if (!turno || !turno.abre || !turno.fecha) return null;
  const abre = paraMinutos(turno.abre);
  let fecha = paraMinutos(turno.fecha);
  if (fecha <= abre) fecha += MINUTOS_NO_DIA;
  return { abre, fecha };
}

function calcularStatus(agora = agoraNaLoja()) {
  const { dia, minutos } = agora;
  const ontem = turnoDoDia((dia + 6) % 7);
  const hoje = turnoDoDia(dia);

  // Madrugada: ainda dentro do turno que começou ontem
  if (ontem && ontem.fecha > MINUTOS_NO_DIA && minutos < ontem.fecha - MINUTOS_NO_DIA) {
    return { aberto: true, fechaAs: ontem.fecha, faltam: ontem.fecha - MINUTOS_NO_DIA - minutos };
  }
  if (hoje && minutos >= hoje.abre && minutos < hoje.fecha) {
    return { aberto: true, fechaAs: hoje.fecha, faltam: hoje.fecha - minutos };
  }

  // Fechado: procura a próxima abertura nos próximos 7 dias
  for (let i = 0; i <= 7; i++) {
    const diaAlvo = (dia + i) % 7;
    const turno = turnoDoDia(diaAlvo);
    if (!turno || (i === 0 && minutos >= turno.abre)) continue;
    return { aberto: false, emDias: i, diaAbre: diaAlvo, abreAs: turno.abre };
  }
  return { aberto: false, emDias: null };
}

function descreverStatus(status) {
  if (status.aberto) {
    const fechando = status.faltam <= 30;
    return {
      estado: fechando ? "fechando" : "aberto",
      titulo: fechando ? "Fechando em breve" : "Aberto agora",
      detalhe: `até ${formatarHora(status.fechaAs)}`,
    };
  }
  if (status.emDias === null) {
    return { estado: "fechado", titulo: "Fechado", detalhe: "sem previsão de abertura" };
  }
  const quando = status.emDias === 0 ? "hoje" : status.emDias === 1 ? "amanhã" : NOMES_DIAS[status.diaAbre];
  return { estado: "fechado", titulo: "Fechado", detalhe: `abre ${quando} às ${formatarHora(status.abreAs)}` };
}

let statusAtual = calcularStatus();

function atualizarStatus() {
  statusAtual = calcularStatus();
  const info = descreverStatus(statusAtual);
  const selo = $("#status-loja");
  selo.dataset.estado = info.estado;
  $("#status-titulo").textContent = info.titulo;
  $("#status-detalhe").textContent = info.detalhe;
  $("#aviso-fechado-quando").textContent = statusAtual.aberto ? "" : `(${info.detalhe})`;
  renderizarHorarios(); // destaca o dia de hoje no rodapé
  atualizarRodape(); // mostra ou esconde o aviso de loja fechada no carrinho
}

/** Lista do rodapé, agrupando dias seguidos com o mesmo horário. */
function renderizarHorarios() {
  const ordem = [1, 2, 3, 4, 5, 6, 0]; // de segunda a domingo
  const textoDoDia = (dia) => {
    const turno = CONFIG.horario[dia];
    return turno ? `${formatarHora(paraMinutos(turno.abre))} – ${formatarHora(paraMinutos(turno.fecha))}` : "Fechado";
  };

  const grupos = [];
  ordem.forEach((dia) => {
    const texto = textoDoDia(dia);
    const anterior = grupos[grupos.length - 1];
    if (anterior && anterior.texto === texto) anterior.dias.push(dia);
    else grupos.push({ texto, dias: [dia] });
  });

  const hoje = agoraNaLoja().dia;
  $("#lista-horarios").innerHTML = grupos
    .map(({ texto, dias }) => {
      const primeiro = capitalizar(NOMES_DIAS[dias[0]]);
      const ultimo = NOMES_DIAS[dias[dias.length - 1]];
      const nome = dias.length === 1 ? primeiro : dias.length === 2 ? `${primeiro} e ${ultimo}` : `${primeiro} a ${ultimo}`;
      const ehHoje = dias.includes(hoje);
      return `<li${ehHoje ? ' class="hoje"' : ""}>
        <span>${nome}${ehHoje ? ' <span class="selo-hoje">hoje</span>' : ""}</span>
        <span>${texto}</span>
      </li>`;
    })
    .join("");
}

/* ==========================================================
   Textos da loja vindos do CONFIG
   ========================================================== */
function aplicarConfig() {
  $$("[data-config]").forEach((el) => {
    const valor = CONFIG[el.dataset.config];
    if (valor !== undefined && valor !== null) el.textContent = valor;
  });
  $$("[data-taxa]").forEach((el) => (el.textContent = textoTaxa()));
  $$("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));

  const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIG.endereco)}`;
  $$("[data-link-mapa]").forEach((a) => (a.href = mapa));
  $$("[data-link-whatsapp]").forEach((a) => (a.href = `https://wa.me/${numeroWhatsapp()}`));
  $$("[data-rede]").forEach((a) => {
    const url = CONFIG.redes && CONFIG.redes[a.dataset.rede];
    if (url) a.href = url;
    else a.closest("li").hidden = true;
  });
}

/* ==========================================================
   Cardápio na tela
   ========================================================== */
function tagsHtml(tags = []) {
  if (!tags.length) return "";
  return `<ul class="tags" role="list">${tags
    .map((tag) => `<li class="tag tag--${slug(tag)}">${esc(tag)}</li>`)
    .join("")}</ul>`;
}

/* A foto é decorativa (alt vazio): o nome do item está sempre ao lado,
   então o leitor de tela não precisa ouvir o nome duas vezes. */
function fotoHtml(item, classeExtra = "") {
  const emoji = esc(item.emoji || "🍔");
  const classes = `foto foto--${esc(item.categoria)} ${classeExtra}`;
  if (item.imagem) {
    return `<div class="${classes}">
      <img src="${esc(item.imagem)}" alt="" loading="lazy" decoding="async" data-emoji="${emoji}">
    </div>`;
  }
  const detalhe = item.detalhe ? `<span class="foto__detalhe">${esc(item.detalhe)}</span>` : "";
  return `<div class="${classes}" aria-hidden="true">
    <span class="foto__emoji">${emoji}</span>${detalhe}
  </div>`;
}

/* Se a foto de um item não carregar (sem internet, link quebrado),
   o emoji do item aparece no lugar. Um ouvinte só vale para o cardápio,
   o detalhe do item e o carrinho. */
document.addEventListener(
  "error",
  (evento) => {
    const img = evento.target;
    if (!(img instanceof HTMLImageElement) || !img.closest(".foto")) return;
    const emoji = document.createElement("span");
    emoji.className = "foto__emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = img.dataset.emoji || "🍔";
    img.replaceWith(emoji);
  },
  true
);

function precosHtml(item) {
  const atual = moeda(emCentavos(item.preco));
  if (!item.precoDe) return `<span class="preco">${atual}</span>`;
  return `<span class="preco-de"><span class="sr-only">De </span><s>${moeda(emCentavos(item.precoDe))}</s></span>
    <span class="preco"><span class="sr-only">por </span>${atual}</span>`;
}

function cardHtml(item) {
  return `
    <li class="card" data-item="${esc(item.id)}">
      <div class="card__info">
        ${tagsHtml(item.tags)}
        <h3 class="card__nome">${esc(item.nome)}</h3>
        <p class="card__desc">${esc(item.descricao)}</p>
        <p class="card__precos">${precosHtml(item)}</p>
      </div>
      <div class="card__lateral">
        ${fotoHtml(item)}
        <button type="button" class="botao-adicionar" data-abrir-item="${esc(item.id)}" aria-label="Adicionar ${esc(item.nome)}">
          ${icone("mais")}Adicionar
        </button>
      </div>
    </li>`;
}

function renderizarCardapio() {
  $("#cardapio").innerHTML = CATEGORIAS_ATIVAS.map((cat) => {
    const itens = CARDAPIO.filter((item) => item.categoria === cat.id);
    return `
      <section class="secao" id="${esc(cat.id)}" aria-labelledby="titulo-${esc(cat.id)}" data-secao>
        <div class="secao__cabecalho">
          <h2 class="secao__titulo" id="titulo-${esc(cat.id)}" tabindex="-1">${esc(cat.nome)}</h2>
          <span class="secao__contagem" data-contagem>${plural(itens.length, "item", "itens")}</span>
        </div>
        ${cat.descricao ? `<p class="secao__desc">${esc(cat.descricao)}</p>` : ""}
        <ul class="grade" role="list">${itens.map(cardHtml).join("")}</ul>
      </section>`;
  }).join("");
}

/* ==========================================================
   Abas de categoria
   ========================================================== */
let abaTravada = false;
let timerAba = 0;

function renderizarAbas() {
  $("#abas").innerHTML = CATEGORIAS_ATIVAS.map(
    (cat, i) =>
      `<li data-aba="${esc(cat.id)}"><a href="#${esc(cat.id)}"${i === 0 ? ' aria-current="true"' : ""}>${esc(cat.nome)}</a></li>`
  ).join("");
}

function ativarAba(id) {
  const lista = $("#abas");
  $$("a", lista).forEach((link) => {
    const ativo = link.hash === `#${id}`;
    if (!ativo) {
      link.removeAttribute("aria-current");
      return;
    }
    if (link.getAttribute("aria-current") === "true") return;
    link.setAttribute("aria-current", "true");
    // Mantém a aba ativa visível na faixa rolável
    const esquerda = link.offsetLeft - (lista.clientWidth - link.offsetWidth) / 2;
    lista.scrollTo({ left: Math.max(0, esquerda), behavior: movimentoReduzido.matches ? "auto" : "smooth" });
  });
}

function iniciarAbas() {
  const secoes = $$("[data-secao]");
  const abas = $(".abas");
  const visiveis = new Set();
  let alturaAbas = 0;
  let observador = null;

  // Rolagem: observa uma faixa logo abaixo das abas (até 35% da tela).
  // A última seção que entrou nessa faixa é a que o cliente está vendo.
  function observarSecoes() {
    if (!("IntersectionObserver" in window)) return;
    if (observador) observador.disconnect();
    visiveis.clear();
    observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => (e.isIntersecting ? visiveis.add(e.target) : visiveis.delete(e.target)));
        if (abaTravada) return;
        const atual = secoes.filter((s) => visiveis.has(s) && !s.hidden).pop();
        if (atual) ativarAba(atual.id);
      },
      { rootMargin: `-${alturaAbas}px 0px -65% 0px` }
    );
    secoes.forEach((secao) => observador.observe(secao));
  }

  // A altura das abas vale para o CSS (scroll-margin) e para a faixa observada.
  // É medida de novo quando muda: fonte que carregou depois, zoom de texto, celular girado.
  function medirAbas() {
    const altura = abas.offsetHeight;
    if (!altura || altura === alturaAbas) return; // 0 = abas escondidas pela busca
    alturaAbas = altura;
    document.documentElement.style.setProperty("--altura-abas", `${altura}px`);
    observarSecoes();
  }

  medirAbas();
  if ("ResizeObserver" in window) new ResizeObserver(medirAbas).observe(abas);

  // Clique na aba: rola até a seção e leva o foco para o título dela
  $("#abas").addEventListener("click", (evento) => {
    const link = evento.target.closest("a");
    if (!link) return;
    evento.preventDefault();
    const secao = document.getElementById(link.hash.slice(1));
    if (!secao) return;
    abaTravada = true;
    clearTimeout(timerAba);
    timerAba = setTimeout(() => (abaTravada = false), 900);
    ativarAba(secao.id);
    secao.scrollIntoView({ behavior: movimentoReduzido.matches ? "auto" : "smooth", block: "start" });
    $(".secao__titulo", secao).focus({ preventScroll: true });
  });

  // No fim da página a última seção pode ser curta demais para chegar ao topo
  let agendado = false;
  window.addEventListener(
    "scroll",
    () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        agendado = false;
        const noFim = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        const ultimaVisivel = secoes.filter((s) => !s.hidden).pop();
        if (noFim && ultimaVisivel && !abaTravada) ativarAba(ultimaVisivel.id);
      });
    },
    { passive: true }
  );
}

/* ==========================================================
   Busca
   ========================================================== */
let timerAnuncioBusca = 0;

function filtrarCardapio(termo) {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean);
  let total = 0;

  $$("[data-secao]").forEach((secao) => {
    let naSecao = 0;
    $$(".card", secao).forEach((card) => {
      const texto = INDICE_BUSCA.get(card.dataset.item) || "";
      const combina = palavras.every((p) => texto.includes(p));
      card.hidden = !combina;
      if (combina) naSecao++;
    });
    secao.hidden = naSecao === 0;
    $("[data-contagem]", secao).textContent = plural(naSecao, "item", "itens");
    const aba = $(`[data-aba="${secao.id}"]`);
    if (aba) aba.hidden = secao.hidden;
    total += naSecao;
  });

  const buscando = palavras.length > 0;
  $("#busca-vazia").hidden = total > 0;
  $(".abas").hidden = total === 0;
  $("#busca-termo").textContent = termo.trim();
  $$(".busca__limpar").forEach((b) => (b.hidden = !buscando));

  clearTimeout(timerAnuncioBusca);
  timerAnuncioBusca = setTimeout(() => {
    $("#busca-status").textContent = !buscando
      ? ""
      : total
        ? `${plural(total, "item encontrado", "itens encontrados")}.`
        : "Nenhum item encontrado.";
  }, 450);
}

function limparBusca() {
  const campo = $("#busca");
  campo.value = "";
  filtrarCardapio("");
  campo.focus();
}

/* ==========================================================
   Painéis: abrir, fechar, prender o foco, Esc
   ========================================================== */
const SELETOR_FOCAVEL = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

let painelAberto = null;
let focoAntesDoPainel = null;

const focaveis = (base) =>
  $$(SELETOR_FOCAVEL, base).filter((el) => !el.closest("[hidden]") && el.getClientRects().length > 0);

function abrirPainel(painel, origem) {
  if (painelAberto === painel) return;
  if (painelAberto) fecharPainel({ devolverFoco: false });

  // "origem" é o botão que abriu o painel: o foco volta para ele ao fechar
  focoAntesDoPainel = origem || document.activeElement;
  painelAberto = painel;
  clearTimeout(painel.timerFechar);

  const veu = $("#veu");
  veu.hidden = false;
  painel.hidden = false;
  void painel.offsetWidth; // aplica a posição inicial antes de animar
  veu.classList.add("aberto");
  painel.classList.add("aberto");

  // O resto da página fica inacessível enquanto o painel está aberto
  $$("[data-pagina]").forEach((el) => (el.inert = true));
  document.body.classList.add("sem-rolagem");

  const alvo = $("[data-foco-inicial]", painel) || focaveis(painel)[0] || painel;
  alvo.focus({ preventScroll: true });
}

function fecharPainel({ devolverFoco = true } = {}) {
  const painel = painelAberto;
  if (!painel) return;
  painelAberto = null;

  painel.classList.remove("aberto");
  $("#veu").classList.remove("aberto");
  $$("[data-pagina]").forEach((el) => (el.inert = false));
  document.body.classList.remove("sem-rolagem");

  const espera = movimentoReduzido.matches ? 0 : 320;
  painel.timerFechar = setTimeout(() => {
    painel.hidden = true;
    if (!painelAberto) $("#veu").hidden = true;
  }, espera);

  if (devolverFoco) {
    // A barra do carrinho some quando ele fica vazio; nesse caso o foco vai para o cardápio
    const origem = focoAntesDoPainel;
    const barraSumiu = origem === $("#barra-carrinho") && carrinho.length === 0;
    const valido = origem && origem !== document.body && document.contains(origem) && !barraSumiu;
    (valido ? origem : $("#cardapio")).focus({ preventScroll: true });
  }
  focoAntesDoPainel = null;
}

function prenderFoco(evento) {
  const lista = focaveis(painelAberto);
  if (!lista.length) {
    evento.preventDefault();
    return;
  }
  const primeiro = lista[0];
  const ultimo = lista[lista.length - 1];
  const dentro = painelAberto.contains(document.activeElement);
  if (evento.shiftKey && (document.activeElement === primeiro || !dentro)) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && (document.activeElement === ultimo || !dentro)) {
    evento.preventDefault();
    primeiro.focus();
  }
}

/* ==========================================================
   Avisos (toast visível e anúncios para leitor de tela)
   ========================================================== */
let timerToast = 0;

function mostrarToast(texto) {
  const toast = $("#toast");
  $("#toast-texto").textContent = texto;
  toast.classList.add("visivel");
  clearTimeout(timerToast);
  timerToast = setTimeout(() => toast.classList.remove("visivel"), 2600);
}

function anunciar(texto) {
  const regiao = $("#anuncio");
  regiao.textContent = "";
  setTimeout(() => (regiao.textContent = texto), 60);
}

/* ==========================================================
   Painel do item (quantidade, adicionais, observação)
   ========================================================== */
const itemEmEdicao = { item: null, qtd: 1 };

function totalDoItemEmEdicao() {
  const { item, qtd } = itemEmEdicao;
  const extras = $$('input[name="extra"]:checked', $("#form-item"))
    .map((input) => ADICIONAIS.get(input.value))
    .filter(Boolean);
  const unitario = emCentavos(item.preco) + extras.reduce((soma, ex) => soma + emCentavos(ex.preco), 0);
  return unitario * qtd;
}

function atualizarPainelItem() {
  const { qtd } = itemEmEdicao;
  $("#item-qtd").textContent = qtd;
  $("#item-menos").disabled = qtd <= 1;
  $("#item-mais").disabled = qtd >= QTD_MAXIMA;
  $("#item-total").textContent = moeda(totalDoItemEmEdicao());
}

function atualizarContadorObs() {
  const campo = $("#item-obs");
  $("#item-obs-contador").textContent = `${campo.value.length} de ${campo.maxLength} caracteres`;
}

function abrirItem(id, origem) {
  const item = ITENS.get(id);
  if (!item) return;
  itemEmEdicao.item = item;
  itemEmEdicao.qtd = 1;

  const categoria = CATEGORIAS.find((cat) => cat.id === item.categoria);
  $("#item-midia").innerHTML = fotoHtml(item);
  $("#item-tags").innerHTML = tagsHtml(item.tags);
  $("#item-titulo").textContent = item.nome;
  $("#item-desc").textContent = item.descricao;
  $("#item-preco").innerHTML = precosHtml(item);

  const extras = extrasDoItem(item);
  $("#item-extras").hidden = extras.length === 0;
  $("#item-extras-lista").innerHTML = extras
    .map(
      (ex) => `
      <label class="opcao">
        <input type="checkbox" name="extra" value="${esc(ex.id)}">
        <span class="opcao__nome">${esc(ex.nome)}</span>
        <span class="opcao__preco">+ ${moeda(emCentavos(ex.preco))}</span>
      </label>`
    )
    .join("");

  const obs = $("#item-obs");
  obs.value = "";
  obs.placeholder = (categoria && categoria.dicaObs) || "Ex.: sem cebola";
  atualizarContadorObs();
  atualizarPainelItem();

  const painel = $("#painel-item");
  abrirPainel(painel, origem);
  $(".painel__corpo", painel).scrollTop = 0;
}

function confirmarItem(evento) {
  evento.preventDefault();
  const { item, qtd } = itemEmEdicao;
  if (!item) return;
  const extras = $$('input[name="extra"]:checked', $("#form-item")).map((input) => input.value);
  const obs = $("#item-obs").value.replace(/\s+/g, " ").trim();

  adicionarAoCarrinho(item.id, qtd, extras, obs);
  fecharPainel();
  mostrarToast(`${qtd}x ${item.nome} no pedido`);

  const barra = $("#barra-carrinho");
  barra.classList.remove("barra-carrinho--pulso");
  void barra.offsetWidth;
  barra.classList.add("barra-carrinho--pulso");
}

/* ==========================================================
   Carrinho (estado + localStorage)
   ========================================================== */
let carrinho = []; // [{ chave, id, qtd, extras: [ids], obs }]

/** Mesmo item, mesmos adicionais e mesma observação = mesma linha. */
const chaveDaLinha = (id, extras, obs) => [id, [...extras].sort().join("+"), normalizar(obs)].join("|");

function precoUnitario(linha) {
  const item = ITENS.get(linha.id);
  const extras = linha.extras.reduce((soma, id) => soma + emCentavos((ADICIONAIS.get(id) || {}).preco), 0);
  return emCentavos(item.preco) + extras;
}

const totalDaLinha = (linha) => precoUnitario(linha) * linha.qtd;
const subtotal = () => carrinho.reduce((soma, linha) => soma + totalDaLinha(linha), 0);
const quantidadeTotal = () => carrinho.reduce((soma, linha) => soma + linha.qtd, 0);

function adicionarAoCarrinho(id, qtd, extras, obs) {
  const chave = chaveDaLinha(id, extras, obs);
  const existente = carrinho.find((linha) => linha.chave === chave);
  if (existente) existente.qtd = Math.min(existente.qtd + qtd, QTD_MAXIMA);
  else carrinho.push({ chave, id, qtd, extras: [...extras].sort(), obs });
  salvarCarrinho();
  atualizarCarrinho();
}

function salvarCarrinho() {
  gravarStorage(
    CHAVE_CARRINHO,
    carrinho.map(({ id, qtd, extras, obs }) => ({ id, qtd, extras, obs }))
  );
}

/** Lê o carrinho salvo e descarta o que não existe mais no cardápio. */
function carregarCarrinho() {
  const salvo = lerStorage(CHAVE_CARRINHO, []);
  if (!Array.isArray(salvo)) return [];
  const linhas = [];
  salvo.forEach((bruta) => {
    if (!bruta || !ITENS.has(bruta.id)) return;
    const qtd = Math.floor(Number(bruta.qtd));
    if (!(qtd > 0)) return;
    const item = ITENS.get(bruta.id);
    const permitidos = item.extras || [];
    const extras = (Array.isArray(bruta.extras) ? bruta.extras : [])
      .filter((id) => permitidos.includes(id) && ADICIONAIS.has(id))
      .sort();
    const obs = typeof bruta.obs === "string" ? bruta.obs.slice(0, 140) : "";
    const chave = chaveDaLinha(bruta.id, extras, obs);
    const repetida = linhas.find((l) => l.chave === chave);
    if (repetida) repetida.qtd = Math.min(repetida.qtd + qtd, QTD_MAXIMA);
    else linhas.push({ chave, id: bruta.id, qtd: Math.min(qtd, QTD_MAXIMA), extras, obs });
  });
  return linhas;
}

function linhaHtml(linha, indice) {
  const item = ITENS.get(linha.id);
  const nome = esc(item.nome);
  const extras = linha.extras.map((id) => ADICIONAIS.get(id)).filter(Boolean);
  const detalhes = [
    ...extras.map((ex) => `<li>+ ${esc(ex.nome)}</li>`),
    linha.obs ? `<li class="linha__obs">Obs.: ${esc(linha.obs)}</li>` : "",
  ].join("");

  return `
    <li class="linha" data-indice="${indice}">
      ${fotoHtml(item, "linha__foto")}
      <div class="linha__info">
        <div class="linha__topo">
          <h3 class="linha__nome">${nome}</h3>
          <button type="button" class="botao-remover" data-acao="remover" aria-label="Remover ${nome} do pedido">${icone("lixo")}</button>
        </div>
        ${detalhes ? `<ul class="linha__detalhes" role="list">${detalhes}</ul>` : ""}
        ${linha.qtd > 1 ? `<p class="linha__unitario">${moeda(precoUnitario(linha))} cada</p>` : ""}
        <div class="linha__base">
          <div class="contador contador--p" role="group" aria-label="Quantidade de ${nome}">
            <button type="button" data-acao="menos" aria-label="Diminuir quantidade de ${nome}"${linha.qtd <= 1 ? " disabled" : ""}>${icone("menos")}</button>
            <span class="contador__valor">${linha.qtd}</span>
            <button type="button" data-acao="mais" aria-label="Aumentar quantidade de ${nome}"${linha.qtd >= QTD_MAXIMA ? " disabled" : ""}>${icone("mais")}</button>
          </div>
          <span class="linha__total">${moeda(totalDaLinha(linha))}</span>
        </div>
      </div>
    </li>`;
}

function atualizarCarrinho() {
  const qtd = quantidadeTotal();
  const vazio = carrinho.length === 0;

  $$("[data-qtd-carrinho]").forEach((el) => (el.textContent = qtd));
  $$("[data-total-carrinho]").forEach((el) => (el.textContent = moeda(subtotal())));

  const barra = $("#barra-carrinho");
  barra.classList.toggle("barra-carrinho--oculta", vazio);
  barra.setAttribute("aria-label", `Ver pedido: ${plural(qtd, "item", "itens")}, ${moeda(subtotal())}`);
  barra.tabIndex = vazio ? -1 : 0;
  document.body.classList.toggle("com-barra", !vazio);
  $(".topo__carrinho").setAttribute("aria-label", vazio ? "Pedido: vazio" : `Pedido: ${plural(qtd, "item", "itens")}`);

  $("#linhas-carrinho").innerHTML = carrinho.map(linhaHtml).join("");
  $("#carrinho-vazio").hidden = !vazio;
  $("#mais-itens").hidden = vazio;

  if (vazio && etapaAtual === "dados") irParaEtapa("itens", { focar: false });
  atualizarRodape();
}

function aoClicarNaLinha(evento) {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;
  const indice = Number(botao.closest(".linha").dataset.indice);
  const linha = carrinho[indice];
  if (!linha) return;
  const item = ITENS.get(linha.id);
  const acao = botao.dataset.acao;

  if (acao === "mais") linha.qtd = Math.min(linha.qtd + 1, QTD_MAXIMA);
  if (acao === "menos") linha.qtd = Math.max(linha.qtd - 1, 1);
  if (acao === "remover") carrinho.splice(indice, 1);

  salvarCarrinho();
  atualizarCarrinho();

  // A lista foi redesenhada: devolve o foco para um lugar que faça sentido
  const linhas = $$("#linhas-carrinho .linha");
  if (acao === "remover") {
    anunciar(`${item.nome} removido do pedido.`);
    const vizinha = linhas[Math.min(indice, linhas.length - 1)];
    if (vizinha) $('[data-acao="remover"]', vizinha).focus();
    else $("#carrinho-vazio .botao").focus();
    return;
  }
  anunciar(`${item.nome}: ${plural(linha.qtd, "unidade", "unidades")}.`);
  const mesma = linhas[indice];
  if (!mesma) return;
  const alvo = $(`[data-acao="${acao}"]`, mesma);
  (alvo && !alvo.disabled ? alvo : $('[data-acao="mais"]', mesma)).focus();
}

/* ==========================================================
   Etapas do carrinho: itens → dados → enviado
   ========================================================== */
const TITULOS_ETAPA = { itens: "Seu pedido", dados: "Finalizar pedido", enviado: "Pedido pronto!" };
const ORDEM_ETAPAS = ["itens", "dados", "enviado"];
let etapaAtual = "itens";

function irParaEtapa(etapa, { focar = true } = {}) {
  etapaAtual = etapa;
  const painel = $("#painel-carrinho");
  $$("[data-etapa]", painel).forEach((bloco) => (bloco.hidden = bloco.dataset.etapa !== etapa));
  $("#carrinho-titulo").textContent = TITULOS_ETAPA[etapa];
  $("#carrinho-voltar").hidden = etapa !== "dados";

  const posicao = ORDEM_ETAPAS.indexOf(etapa);
  $$(".etapas li", painel).forEach((li, i) => {
    li.classList.toggle("feita", i < posicao);
    if (i === posicao) li.setAttribute("aria-current", "step");
    else li.removeAttribute("aria-current");
  });

  atualizarRodape();
  $("#carrinho-corpo").scrollTop = 0;
  if (focar) $("#carrinho-titulo").focus({ preventScroll: true });
}

function atualizarRodape() {
  const vazio = carrinho.length === 0;
  const naEtapaDados = etapaAtual === "dados";
  const comEntrega = naEtapaDados && tipoEscolhido() === "entrega";
  const taxa = comEntrega ? taxaEmCentavos() : 0;

  $("#carrinho-rodape").hidden = vazio || etapaAtual === "enviado";
  $("#aviso-fechado").hidden = statusAtual.aberto || vazio || etapaAtual === "enviado";
  $("#total-subtotal").textContent = moeda(subtotal());
  $("#linha-taxa").hidden = !comEntrega;
  $("#total-taxa").textContent = textoTaxa();
  $("#linha-total").hidden = !naEtapaDados;
  $("#total-geral").textContent = moeda(subtotal() + taxa);
  $("#nota-taxa").hidden = naEtapaDados || taxaEmCentavos() === 0;
  $("#botao-continuar").hidden = etapaAtual !== "itens";
  $("#botao-enviar").hidden = !naEtapaDados;
}

function abrirCarrinho(origem) {
  irParaEtapa("itens", { focar: false });
  abrirPainel($("#painel-carrinho"), origem);
}

/* ==========================================================
   Finalização: formulário, validação e WhatsApp
   ========================================================== */
const formCheckout = () => $("#form-checkout");
const tipoEscolhido = () => formCheckout().elements.tipo.value || "entrega";
const pagamentoEscolhido = () => formCheckout().elements.pagamento.value;

function atualizarFormulario() {
  const entrega = tipoEscolhido() === "entrega";
  $("#grupo-endereco").hidden = !entrega;
  $("#rotulo-cartao").textContent = entrega ? "Cartão na entrega" : "Cartão na retirada";
  $("#sub-cartao").textContent = entrega
    ? "Crédito ou débito, o entregador leva a maquininha"
    : "Crédito ou débito, direto no balcão";
  $("#campo-troco").hidden = pagamentoEscolhido() !== "dinheiro";
  atualizarRodape();
}

function lerFormulario() {
  const campos = formCheckout().elements;
  const valor = (nome) => String(campos[nome].value || "").replace(/\s+/g, " ").trim();
  return {
    nome: valor("nome"),
    tipo: tipoEscolhido(),
    endereco: valor("endereco"),
    bairro: valor("bairro"),
    complemento: valor("complemento"),
    pagamento: pagamentoEscolhido(),
    trocoTexto: valor("troco"),
  };
}

function validarPedido(dados) {
  const erros = [];
  const total = subtotal() + (dados.tipo === "entrega" ? taxaEmCentavos() : 0);

  if (dados.nome.length < 2) erros.push(["nome", "Informe seu nome para sabermos de quem é o pedido."]);

  if (dados.tipo === "entrega") {
    if (dados.endereco.length < 4) erros.push(["endereco", "Informe a rua e o número para a entrega."]);
    else if (!/\d|s\/?n/i.test(dados.endereco))
      erros.push(["endereco", "Faltou o número. Se não houver, escreva “s/n”."]);
    if (dados.bairro.length < 2) erros.push(["bairro", "Informe o bairro para calcularmos a rota."]);
  }

  if (!dados.pagamento) erros.push(["pagamento", "Escolha como você prefere pagar."]);

  if (dados.pagamento === "dinheiro" && dados.trocoTexto) {
    const troco = lerValorEmCentavos(dados.trocoTexto);
    if (troco === null) erros.push(["troco", "Digite um valor válido, por exemplo: 100,00."]);
    else if (troco < total) erros.push(["troco", `O valor precisa ser igual ou maior que o total do pedido (${moeda(total)}).`]);
  }
  return erros;
}

function camposDoErro(nome) {
  const form = formCheckout();
  return nome === "pagamento" ? $$('input[name="pagamento"]', form) : [form.elements[nome]];
}

function mostrarErro(nome, mensagem) {
  const caixa = $(`#erro-${nome}`);
  caixa.innerHTML = `${icone("alerta")}<span>${esc(mensagem)}</span>`;
  caixa.hidden = false;
  camposDoErro(nome).forEach((campo) => campo.setAttribute("aria-invalid", "true"));
}

function limparErro(nome) {
  const caixa = $(`#erro-${nome}`);
  if (!caixa) return;
  caixa.hidden = true;
  caixa.textContent = "";
  camposDoErro(nome).forEach((campo) => campo.removeAttribute("aria-invalid"));
}

const limparErros = () => ["nome", "endereco", "bairro", "pagamento", "troco"].forEach(limparErro);

function textoPagamento(dados, total) {
  if (dados.pagamento === "pix") return "Pix (pode me enviar a chave)";
  if (dados.pagamento === "cartao") {
    return dados.tipo === "entrega" ? "Cartão na entrega (trazer maquininha)" : "Cartão na retirada";
  }
  const troco = lerValorEmCentavos(dados.trocoTexto);
  if (troco && troco > total) return `Dinheiro, troco para ${moeda(troco)} (levar ${moeda(troco - total)} de troco)`;
  return "Dinheiro, não preciso de troco";
}

/** Monta o texto que vai pronto para o WhatsApp (*negrito* e _itálico_ do WhatsApp). */
function montarMensagem(dados) {
  const entrega = dados.tipo === "entrega";
  const taxa = entrega ? taxaEmCentavos() : 0;
  const sub = subtotal();
  const total = sub + taxa;
  const linhas = [];

  linhas.push(`*Novo pedido | ${CONFIG.nome}*`);
  if (!calcularStatus().aberto) linhas.push("_Pedido enviado fora do horário. Pode responder quando abrir._");
  linhas.push("");
  linhas.push(`*Nome:* ${dados.nome}`);
  linhas.push(`*Recebimento:* ${entrega ? "Entrega" : "Retirada no balcão"}`);
  linhas.push("");
  linhas.push("*Itens*");
  carrinho.forEach((linha) => {
    const item = ITENS.get(linha.id);
    linhas.push(`• ${linha.qtd}x ${item.nome} — ${moeda(totalDaLinha(linha))}`);
    linha.extras.forEach((id) => {
      const extra = ADICIONAIS.get(id);
      if (extra) linhas.push(`   + ${extra.nome}`);
    });
    if (linha.obs) linhas.push(`   Obs.: ${linha.obs}`);
  });
  linhas.push("");
  linhas.push(`Subtotal: ${moeda(sub)}`);
  if (entrega) linhas.push(`Taxa de entrega: ${taxa ? moeda(taxa) : "grátis"}`);
  linhas.push(`*Total: ${moeda(total)}*`);
  linhas.push("");

  if (entrega) {
    linhas.push("*Endereço de entrega*");
    linhas.push(dados.endereco);
    linhas.push(`Bairro: ${dados.bairro}`);
    if (dados.complemento) linhas.push(`Complemento: ${dados.complemento}`);
  } else {
    linhas.push(`*Retirada em:* ${CONFIG.endereco}`);
  }
  linhas.push("");
  linhas.push(`*Pagamento:* ${textoPagamento(dados, total)}`);

  return linhas.join("\n");
}

/** Mostra o aviso "preenchemos com seus dados" só quando há dados salvos. */
function atualizarAvisoDadosSalvos() {
  const salvo = lerStorage(CHAVE_CLIENTE, null);
  $("#dados-salvos").hidden = !salvo || typeof salvo !== "object";
}

function salvarCliente(dados) {
  const { nome, tipo, endereco, bairro, complemento, pagamento } = dados;
  gravarStorage(CHAVE_CLIENTE, { nome, tipo, endereco, bairro, complemento, pagamento });
  atualizarAvisoDadosSalvos();
}

/** Preenche o formulário com os dados do último pedido feito neste aparelho. */
function preencherCliente() {
  atualizarAvisoDadosSalvos();
  const salvo = lerStorage(CHAVE_CLIENTE, null);
  if (!salvo || typeof salvo !== "object") return;
  const campos = formCheckout().elements;
  ["nome", "endereco", "bairro", "complemento"].forEach((nome) => {
    if (typeof salvo[nome] === "string") campos[nome].value = salvo[nome];
  });
  if (salvo.tipo === "entrega" || salvo.tipo === "retirada") campos.tipo.value = salvo.tipo;
  if (["pix", "cartao", "dinheiro"].includes(salvo.pagamento)) campos.pagamento.value = salvo.pagamento;
}

/** "Apagar meus dados": tira nome e endereço deste aparelho e limpa o formulário. */
function esquecerCliente() {
  apagarStorage(CHAVE_CLIENTE);
  formCheckout().reset();
  limparErros();
  atualizarFormulario();
  atualizarAvisoDadosSalvos();
  $("#cliente-nome").focus();
  anunciar("Seus dados foram apagados deste aparelho.");
}

/** Enter num campo de texto leva ao próximo campo, em vez de enviar o pedido
    pela metade (no celular, a tecla "Ir" do teclado equivale ao Enter).
    No último campo, o foco vai para o botão de enviar. */
function avancarComEnter(evento) {
  const campo = evento.target;
  if (evento.key !== "Enter" || evento.isComposing) return;
  if (!campo.matches("input:not([type='radio']):not([type='checkbox'])")) return;
  evento.preventDefault();

  const form = formCheckout();
  const textos = focaveis(form).filter((el) => el.matches("input:not([type='radio'])"));
  const proximo = textos[textos.indexOf(campo) + 1];
  if (proximo) proximo.focus();
  else if (!pagamentoEscolhido()) $('input[name="pagamento"]', form).focus();
  else $("#botao-enviar").focus();
}

function enviarPedido(evento) {
  evento.preventDefault();
  limparErros();
  const dados = lerFormulario();
  const erros = validarPedido(dados);

  if (erros.length) {
    erros.forEach(([nome, mensagem]) => mostrarErro(nome, mensagem));
    const [primeiroCampo] = camposDoErro(erros[0][0]);
    primeiroCampo.focus();
    anunciar(erros.length === 1 ? "Falta um dado para enviar o pedido." : `Faltam ${erros.length} dados para enviar o pedido.`);
    return;
  }

  const url = `https://wa.me/${numeroWhatsapp()}?text=${encodeURIComponent(montarMensagem(dados))}`;
  salvarCliente(dados);
  window.open(url, "_blank", "noopener");
  $("#link-whatsapp").href = url;
  irParaEtapa("enviado");
}

function novoPedido() {
  carrinho = [];
  salvarCarrinho();
  atualizarCarrinho();
  fecharPainel();
  irParaEtapa("itens", { focar: false });
  mostrarToast("Tudo certo! Carrinho pronto para um novo pedido.");
}

/* ==========================================================
   Eventos
   ========================================================== */
function ligarEventos() {
  // Botões espalhados pela página (delegação)
  document.addEventListener("click", (evento) => {
    const alvo = evento.target.closest("[data-abrir-item], [data-abrir-carrinho], [data-fechar-painel], [data-limpar-busca]");
    if (!alvo) return;
    if (alvo.matches("[data-abrir-item]")) abrirItem(alvo.dataset.abrirItem, alvo);
    else if (alvo.matches("[data-abrir-carrinho]")) abrirCarrinho(alvo);
    else if (alvo.matches("[data-fechar-painel]")) fecharPainel();
    else if (alvo.matches("[data-limpar-busca]")) limparBusca();
  });

  $("#veu").addEventListener("click", () => fecharPainel());

  document.addEventListener("keydown", (evento) => {
    if (!painelAberto || evento.isComposing) return;
    if (evento.key === "Escape") {
      evento.preventDefault();
      fecharPainel();
    } else if (evento.key === "Tab") {
      prenderFoco(evento);
    }
  });

  // Busca
  const busca = $("#busca");
  busca.addEventListener("input", () => filtrarCardapio(busca.value));
  busca.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") busca.blur(); // fecha o teclado no celular
  });

  // Painel do item
  $("#item-menos").addEventListener("click", () => {
    itemEmEdicao.qtd = Math.max(1, itemEmEdicao.qtd - 1);
    atualizarPainelItem();
    if ($("#item-menos").disabled) $("#item-mais").focus();
  });
  $("#item-mais").addEventListener("click", () => {
    itemEmEdicao.qtd = Math.min(QTD_MAXIMA, itemEmEdicao.qtd + 1);
    atualizarPainelItem();
    if ($("#item-mais").disabled) $("#item-menos").focus();
  });
  $("#form-item").addEventListener("change", atualizarPainelItem);
  $("#form-item").addEventListener("submit", confirmarItem);
  $("#item-obs").addEventListener("input", atualizarContadorObs);

  // Carrinho
  $("#linhas-carrinho").addEventListener("click", aoClicarNaLinha);
  $("#botao-continuar").addEventListener("click", () => irParaEtapa("dados"));
  $("#carrinho-voltar").addEventListener("click", () => irParaEtapa("itens"));
  $("#novo-pedido").addEventListener("click", novoPedido);

  // Finalização
  const form = formCheckout();
  form.addEventListener("submit", enviarPedido);
  form.addEventListener("keydown", avancarComEnter);
  $("#esquecer-dados").addEventListener("click", esquecerCliente);
  form.addEventListener("change", (evento) => {
    if (evento.target.name === "tipo" || evento.target.name === "pagamento") atualizarFormulario();
    if (evento.target.name === "pagamento") limparErro("pagamento");
  });
  form.addEventListener("input", (evento) => {
    if (evento.target.getAttribute("aria-invalid") === "true") limparErro(evento.target.name);
  });

  // Carrinho alterado em outra aba do navegador
  window.addEventListener("storage", (evento) => {
    if (evento.key !== CHAVE_CARRINHO) return;
    carrinho = carregarCarrinho();
    atualizarCarrinho();
  });
}

/* ==========================================================
   Início
   ========================================================== */
function iniciar() {
  aplicarConfig();
  renderizarAbas();
  renderizarCardapio();
  atualizarStatus();
  setInterval(atualizarStatus, 60 * 1000);

  carrinho = carregarCarrinho();
  preencherCliente();
  atualizarFormulario();
  atualizarCarrinho();

  ligarEventos();
  iniciarAbas();
}

iniciar();
