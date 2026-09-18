/* =======================================================================
   What time is it? — circuito de provas (4º ano)
   Fase 1: escolher    Fase 2: montar (scramble)
   Fase 3: escrever    Fase 4: checar (certo ou errado)
   ======================================================================= */

const NUM   = ['', 'one', 'two', 'three', 'four', 'five', 'six',
               'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const TIPOS = ['half', 'past', 'to'];

const FASES = {
  1: { chave: 'f1', nome: 'Escolha a resposta',
       enunciado: 'What time is it?', dica: 'Toque na opção certa.' },
  2: { chave: 'f2', nome: 'Monte a frase',
       enunciado: 'Put the words in order.', dica: 'Os blocos estão embaralhados — coloque na ordem certa.' },
  3: { chave: 'f3', nome: 'Escreva a hora',
       enunciado: 'Write the time in English.', dica: 'Escreva por extenso. Ex.: half past four' },
  4: { chave: 'f4', nome: 'Check! Está certo?',
       enunciado: 'Is this correct?', dica: 'Olhe o relógio e decida se a frase está certa ou errada.' }
};

/* ---------------------------------------------------------------- frases */
function frase(tipo, h) {
  if (tipo === 'half') return 'half past ' + NUM[h];
  if (tipo === 'past') return 'quarter past ' + NUM[h];
  return 'quarter to ' + NUM[h];
}

/* hora que o relógio precisa mostrar para cada frase */
function horaDoRelogio(tipo, h) {
  if (tipo === 'half') return [h, 30];
  if (tipo === 'past') return [h, 15];
  return [h === 1 ? 12 : h - 1, 45];      // quarter to 1  =  12:45
}

function horaVizinha(h, passo) { return ((h - 1 + passo + 12) % 12) + 1; }

/* ------------------------------------------------------- desenho do relógio */
function ponto(cx, cy, raio, graus) {
  const rad = (graus - 90) * Math.PI / 180;
  return [cx + raio * Math.cos(rad), cy + raio * Math.sin(rad)];
}

function relogioSVG(hora, minuto) {
  const cx = 100, cy = 100;
  const anguloMin  = minuto * 6;
  const anguloHora = (hora % 12) * 30 + minuto * 0.5;   // o ponteiro pequeno anda junto

  let marcas = '';
  for (let m = 0; m < 60; m++) {
    const grande = m % 5 === 0;
    const [x1, y1] = ponto(cx, cy, grande ? 82 : 86, m * 6);
    const [x2, y2] = ponto(cx, cy, 90, m * 6);
    marcas += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) +
              '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
              '" stroke="' + (grande ? '#33506e' : '#b9c9dc') +
              '" stroke-width="' + (grande ? 3 : 1.5) + '" stroke-linecap="round"/>';
  }

  let numeros = '';
  for (let n = 1; n <= 12; n++) {
    const [x, y] = ponto(cx, cy, 68, n * 30);
    numeros += '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) +
               '" text-anchor="middle" dominant-baseline="central" ' +
               'font-family="Segoe UI,Arial,sans-serif" font-size="17" font-weight="700" fill="#1d2b3a">' + n + '</text>';
  }

  const [hx, hy] = ponto(cx, cy, 42, anguloHora);   // ponteiro pequeno = HORA
  const [mx, my] = ponto(cx, cy, 70, anguloMin);    // ponteiro grande  = MINUTOS
  const [hx0, hy0] = ponto(cx, cy, -10, anguloHora);
  const [mx0, my0] = ponto(cx, cy, -12, anguloMin);

  return '<svg viewBox="0 0 200 200" role="img" aria-label="relógio marcando ' +
      hora + ' horas e ' + minuto + ' minutos">' +
    '<circle cx="100" cy="100" r="96" fill="#ffffff" stroke="#33506e" stroke-width="5"/>' +
    '<circle cx="100" cy="100" r="88" fill="#ffffff" stroke="#e6eef8" stroke-width="1"/>' +
    marcas + numeros +
    '<line x1="' + hx0.toFixed(1) + '" y1="' + hy0.toFixed(1) + '" x2="' + hx.toFixed(1) + '" y2="' + hy.toFixed(1) +
      '" stroke="#1d2b3a" stroke-width="8" stroke-linecap="round"/>' +
    '<line x1="' + mx0.toFixed(1) + '" y1="' + my0.toFixed(1) + '" x2="' + mx.toFixed(1) + '" y2="' + my.toFixed(1) +
      '" stroke="#2f6fd0" stroke-width="4.5" stroke-linecap="round"/>' +
    '<circle cx="100" cy="100" r="6" fill="#1d2b3a"/>' +
    '<circle cx="100" cy="100" r="2.5" fill="#ffffff"/>' +
  '</svg>';
}

/* ------------------------------------------------------------- sorteios */
function embaralhar(lista) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function todasAsHoras() {
  const todas = [];
  TIPOS.forEach((t) => { for (let h = 1; h <= 12; h++) todas.push({ tipo: t, h: h }); });
  return todas;
}

/* três alternativas erradas, sempre confusões típicas da matéria */
function gerarOpcoes(q) {
  const certa = frase(q.tipo, q.h);
  const outros = TIPOS.filter((t) => t !== q.tipo);
  const candidatas = embaralhar([
    frase(outros[0], q.h),
    frase(outros[1], q.h),
    frase(q.tipo, horaVizinha(q.h, 1)),
    frase(q.tipo, horaVizinha(q.h, -1)),
    frase(outros[0], horaVizinha(q.h, 1))
  ]);
  const escolhidas = [certa];
  candidatas.forEach((c) => { if (escolhidas.length < 4 && escolhidas.indexOf(c) === -1) escolhidas.push(c); });
  return embaralhar(escolhidas);
}

function fraseErrada(q) {
  const opcoes = gerarOpcoes(q).filter((f) => f !== frase(q.tipo, q.h));
  return opcoes[Math.floor(Math.random() * opcoes.length)];
}

function gerarProva() {
  const sorteadas = embaralhar(todasAsHoras());        // 36 combinações possíveis

  // fase 1: 12 relogios, 4 de cada tipo (half past / quarter past / quarter to),
  // sempre em horas diferentes dentro do mesmo tipo
  const f1 = embaralhar(TIPOS.reduce((lista, tipo) => lista.concat(
    embaralhar([1,2,3,4,5,6,7,8,9,10,11,12]).slice(0, 4).map((h) => ({ tipo: tipo, h: h }))
  ), [])).map((q) => ({ tipo: q.tipo, h: q.h, opcoes: gerarOpcoes(q) }));

  const f2 = sorteadas.slice(0, 7).map((q) => {
    const palavras = frase(q.tipo, q.h).split(' ');
    let blocos = embaralhar(palavras);
    let tentativas = 0;
    while (blocos.join(' ') === palavras.join(' ') && tentativas++ < 20) blocos = embaralhar(palavras);
    return { tipo: q.tipo, h: q.h, blocos: blocos };
  });

  const f3 = sorteadas.slice(7, 14).map((q) => ({ tipo: q.tipo, h: q.h }));

  const f4 = embaralhar(sorteadas.slice(14, 22).map((q, i) => {
    const certa = i % 2 === 0;
    return { tipo: q.tipo, h: q.h, certa: certa, mostrada: certa ? frase(q.tipo, q.h) : fraseErrada(q) };
  }));

  return { f1: f1, f2: f2, f3: f3, f4: f4 };
}

/* -------------------------------------------------- conferir o que digitou */
const MAPA_NUM = { '1':'one','2':'two','3':'three','4':'four','5':'five','6':'six',
                   '7':'seven','8':'eight','9':'nine','10':'ten','11':'eleven','12':'twelve' };
const IGNORAR = ['a', 'the', 'it', 'is', 'its', 'oclock'];

function normalizar(texto) {
  let s = String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/o\s*['’]?\s*clock/g, ' oclock ')   // o'clock
       .replace(/['’]/g, '')                        // it's -> its
       .replace(/[^a-z0-9]+/g, ' ').trim();
  return s.split(/\s+/)
    .map((p) => MAPA_NUM[p] || p)
    .filter((p) => p && IGNORAR.indexOf(p) === -1)
    .join(' ');
}

function distancia(a, b) {
  const m = a.length, n = b.length;
  let linha = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let anterior = linha[0]; linha[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = linha[j];
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = temp;
    }
  }
  return linha[n];
}

/* ------------------------------------------------------------- som curto */
let somLigado = true;
let audio = null;
function apitar(acertou) {
  if (!somLigado) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const notas = acertou ? [660, 880] : [300, 220];
    notas.forEach((f, i) => {
      const osc = audio.createOscillator(), vol = audio.createGain();
      osc.type = 'sine'; osc.frequency.value = f;
      vol.gain.setValueAtTime(0.0001, audio.currentTime + i * 0.12);
      vol.gain.exponentialRampToValueAtTime(0.16, audio.currentTime + i * 0.12 + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + i * 0.12 + 0.18);
      osc.connect(vol); vol.connect(audio.destination);
      osc.start(audio.currentTime + i * 0.12); osc.stop(audio.currentTime + i * 0.12 + 0.2);
    });
  } catch (e) { /* som é opcional */ }
}

/* ============================== ESTADO ================================== */
let estado = null;
let acaoPrincipal = null;
let montagem = [];                       // fase 2: índices dos blocos já usados

const $ = (id) => document.getElementById(id);

function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach((t) => t.classList.toggle('ativa', t.id === id));
  window.scrollTo(0, 0);
}

function novoEstado(nome, turma) {
  const perguntas = gerarProva();
  return {
    versao: 1,
    nome: nome, turma: turma,
    inicio: new Date().toISOString(),
    atualizado: new Date().toISOString(),
    fase: 1, indice: 0, concluido: false,
    perguntas: perguntas,
    respostas: { f1: [], f2: [], f3: [], f4: [] },
    totais: {
      f1: perguntas.f1.length, f2: perguntas.f2.length,
      f3: perguntas.f3.length, f4: perguntas.f4.length,
      geral: perguntas.f1.length + perguntas.f2.length + perguntas.f3.length + perguntas.f4.length
    }
  };
}

/* ------------------------------------------------- salvar automaticamente */
/* Backend: web app do Apps Script (planilha) quando CONFIG.API esta preenchido;
   senao, o servidor local (node server.js). Os dois falam a mesma linguagem:
   GET  ?acao=progresso&nome=...   ->  { encontrado, progresso }
   POST corpo = estado em JSON     ->  { ok: true }                            */
var API = (window.CONFIG && window.CONFIG.API) || '/api';

function urlApi(parametros) {
  var partes = [];
  Object.keys(parametros).forEach(function (k) {
    partes.push(encodeURIComponent(k) + '=' + encodeURIComponent(parametros[k]));
  });
  return API + (API.indexOf('?') >= 0 ? '&' : '?') + partes.join('&');
}

let salvandoTimer = null;
let salvandoAgora = false;    // ja tem um POST no ar
let salvarDeNovo  = false;    // chegou pedido novo enquanto salvava

function marcarSalvo(ok) {
  const el = $('salvo');
  if (!el) return;
  const onde = (window.CONFIG && window.CONFIG.API) ? 'na planilha' : 'no computador';
  el.textContent = ok ? '\u2714 progresso salvo ' + onde + ' da professora'
                      : '\u26a0 n\u00e3o consegui salvar agora \u2014 avise a professora';
  el.style.color = ok ? '' : '#d2453c';
}

/* Um salvamento por vez. Se chegar outro pedido enquanto o primeiro esta no
   ar, ele nao entra na fila: fica so a marca de "salvar de novo", e no fim o
   estado mais novo e enviado uma unica vez. Isso evita dois POSTs cruzados
   (o mais antigo chegando depois e apagando respostas mais novas) e alivia a
   planilha quando a turma inteira salva junto.                              */
function salvar() {
  if (!estado) return Promise.resolve();
  if (salvandoAgora) { salvarDeNovo = true; return Promise.resolve(); }

  salvandoAgora = true;
  estado.atualizado = new Date().toISOString();
  try { localStorage.setItem('prova-relogios', JSON.stringify(estado)); } catch (e) {}

  function acabou(ok) {
    marcarSalvo(ok);
    salvandoAgora = false;
    if (salvarDeNovo) { salvarDeNovo = false; salvar(); }
  }

  /* text/plain de proposito: evita o pedido de permissao (preflight) que o
     Apps Script nao responde. O conteudo continua sendo JSON.              */
  return fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(estado),
    redirect: 'follow'
  })
    .then(function (r) { return r.ok ? r.json() : { erro: 'http ' + r.status }; })
    .then(function (d) { acabou(!!(d && d.ok)); })
    .catch(function () { acabou(false); });
}

function salvarEmBreve() {
  clearTimeout(salvandoTimer);
  salvandoTimer = setTimeout(salvar, 300);
}

/* salva na hora em que a aba e fechada / trocada / o computador e desligado */
function salvarAoSair() {
  if (!estado) return;
  estado.atualizado = new Date().toISOString();
  const corpo = JSON.stringify(estado);
  try { localStorage.setItem('prova-relogios', corpo); } catch (e) {}
  try {
    const enviado = navigator.sendBeacon(API,
      new Blob([corpo], { type: 'text/plain;charset=utf-8' }));
    if (!enviado) throw new Error('beacon recusado');
  } catch (e) {
    try {
      fetch(API, { method: 'POST', body: corpo, keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    } catch (e2) {}
  }
}

window.addEventListener('pagehide', salvarAoSair);
window.addEventListener('beforeunload', salvarAoSair);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') salvarAoSair();
});
setInterval(() => { if (estado && !estado.concluido) salvar(); }, 30000);

/* ============================== TELA DE INÍCIO ========================== */
let pendente = null;   // progresso encontrado no servidor, esperando a escolha

$('relogio-capa').innerHTML = relogioSVG(10, 30);

$('form-nome').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const nome  = $('campo-nome').value.trim().replace(/\s+/g, ' ');
  const turma = $('campo-turma').value.trim();
  if (nome.length < 2) {
    $('aviso-nome').hidden = false;
    $('campo-nome').focus();
    return;
  }
  $('aviso-nome').hidden = true;

  fetch(urlApi({ acao: 'progresso', nome: nome }), { redirect: 'follow' })
    .then((r) => r.json())
    .then((dados) => {
      if (dados.encontrado && dados.progresso && dados.progresso.perguntas) {
        pendente = dados.progresso;
        pendente.turma = turma || pendente.turma;
        const p = pendente;
        const feitas = ['f1','f2','f3','f4'].reduce((a, k) => a + (p.respostas[k] || []).filter(Boolean).length, 0);
        $('texto-retomar').textContent = p.concluido
          ? 'Olá de novo, ' + p.nome + '! Você já terminou esta prova.'
          : 'Olá de novo, ' + p.nome + '! Você já tinha respondido ' + feitas + ' perguntas.';
        $('btn-continuar').textContent = p.concluido ? 'Ver o meu resultado' : 'Continuar de onde parei';
        $('caixa-retomar').hidden = false;
        $('form-nome').hidden = true;
      } else {
        comecar(novoEstado(nome, turma));
      }
    })
    .catch(() => comecar(novoEstado(nome, turma)));
});

$('btn-continuar').addEventListener('click', () => {
  if (!pendente) return;
  estado = pendente;
  if (estado.concluido) { mostrarFim(); } else { mostrarTela('tela-jogo'); renderizar(); }
  salvar();
});

$('btn-recomecar').addEventListener('click', () => {
  const nome  = $('campo-nome').value.trim().replace(/\s+/g, ' ');
  const turma = $('campo-turma').value.trim() || (pendente && pendente.turma) || '';
  comecar(novoEstado(nome, turma));
});

function comecar(novo) {
  estado = novo;
  $('caixa-retomar').hidden = true;
  $('form-nome').hidden = false;
  mostrarTela('tela-jogo');
  renderizar();
  salvar();
}

$('btn-som').addEventListener('click', () => {
  somLigado = !somLigado;
  $('btn-som').textContent = somLigado ? '🔊' : '🔇';
});

$('btn-principal').addEventListener('click', () => { if (acaoPrincipal) acaoPrincipal(); });
$('btn-proxima-fase').addEventListener('click', () => { mostrarTela('tela-jogo'); renderizar(); });
$('btn-sair').addEventListener('click', () => {
  salvar().then(() => {
    estado = null;
    pendente = null;
    $('form-nome').reset();
    $('form-nome').hidden = false;
    $('caixa-retomar').hidden = true;
    mostrarTela('tela-inicio');
  });
});

/* ============================== A PROVA ================================= */
function acertosDaFase(chave) {
  return (estado.respostas[chave] || []).filter((r) => r && r.acertou).length;
}
function acertosTotais() {
  return ['f1','f2','f3','f4'].reduce((a, k) => a + acertosDaFase(k), 0);
}

function configurarBotao(rotulo, acao, ativo) {
  const b = $('btn-principal');
  b.textContent = rotulo;
  b.hidden = !rotulo;
  b.disabled = ativo === false;
  acaoPrincipal = acao;
}

function renderizar() {
  if (!estado) return;
  if (estado.fase > 4) return mostrarFim();

  const fase  = FASES[estado.fase];
  const lista = estado.perguntas[fase.chave];
  if (estado.indice >= lista.length) return terminarFase();

  const q = lista[estado.indice];
  const jaRespondida = (estado.respostas[fase.chave] || [])[estado.indice];

  $('etiqueta-fase').textContent = 'Fase ' + estado.fase + ' de 4';
  $('titulo-fase').textContent = fase.nome;
  $('placar').textContent = acertosTotais() + ' acertos';
  $('contador').textContent = 'Pergunta ' + (estado.indice + 1) + ' de ' + lista.length;
  $('barra-cheia').style.width = ((estado.indice) / lista.length * 100).toFixed(1) + '%';
  $('enunciado').innerHTML = fase.enunciado + '<span class="dica">' + fase.dica + '</span>';
  $('feedback').hidden = true;
  $('feedback').className = 'feedback';

  const [hora, minuto] = horaDoRelogio(q.tipo, q.h);
  $('palco-relogio').innerHTML = relogioSVG(hora, minuto);

  if (estado.fase === 1) montarFase1(q);
  if (estado.fase === 2) montarFase2(q);
  if (estado.fase === 3) montarFase3(q);
  if (estado.fase === 4) montarFase4(q);

  if (jaRespondida) {           // voltou depois de ter respondido: não responde de novo
    $('area-resposta').querySelectorAll('button, input')
      .forEach((el) => { el.disabled = true; });
    const fb = $('feedback');
    fb.hidden = false;
    fb.className = 'feedback ' + (jaRespondida.acertou ? 'certo' : 'errado');
    fb.innerHTML = (jaRespondida.acertou ? 'Você já acertou esta. ✔' : 'Você já respondeu esta.') +
      '<span class="resposta">' + jaRespondida.correta + '</span>';
    configurarBotao('Próxima →', proximaPergunta, true);
    $('btn-principal').hidden = false;
  }
}

/* ---- Fase 1: múltipla escolha ---- */
function montarFase1(q) {
  const certa = frase(q.tipo, q.h);
  const area = $('area-resposta');
  area.innerHTML = '<div class="opcoes">' +
    q.opcoes.map((o, i) => '<button type="button" class="opcao" data-i="' + i + '">' + o + '</button>').join('') +
    '</div>';
  configurarBotao('', null, false);
  $('btn-principal').hidden = true;

  area.querySelectorAll('.opcao').forEach((botao) => {
    botao.addEventListener('click', () => {
      const escolhida = q.opcoes[Number(botao.dataset.i)];
      const acertou = escolhida === certa;
      area.querySelectorAll('.opcao').forEach((b) => {
        b.disabled = true;
        if (b.textContent === certa) b.classList.add('certa');
      });
      if (!acertou) botao.classList.add('errada');
      registrar(q, escolhida, certa, acertou);
    });
  });
}

/* ---- Fase 2: montar a frase com blocos embaralhados ---- */
function montarFase2(q) {
  const certa = frase(q.tipo, q.h);
  montagem = [];
  const area = $('area-resposta');
  area.innerHTML =
    '<div class="linha-montagem vazia" id="linha-montagem"></div>' +
    '<div class="banco" id="banco">' +
      q.blocos.map((p, i) => '<button type="button" class="bloco" data-i="' + i + '">' + p + '</button>').join('') +
    '</div>';

  const linha = $('linha-montagem'), banco = $('banco');

  function desenhar() {
    linha.innerHTML = montagem.map((i) =>
      '<button type="button" class="bloco" data-pos="' + i + '">' + q.blocos[i] + '</button>').join('');
    linha.classList.toggle('vazia', montagem.length === 0);
    banco.querySelectorAll('.bloco').forEach((b) =>
      b.classList.toggle('usado', montagem.indexOf(Number(b.dataset.i)) !== -1));
    linha.querySelectorAll('.bloco').forEach((b) => b.addEventListener('click', () => {
      montagem = montagem.filter((i) => i !== Number(b.dataset.pos));
      desenhar();
    }));
    configurarBotao('Verificar', verificar, montagem.length === q.blocos.length);
  }

  banco.querySelectorAll('.bloco').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.i);
    if (montagem.indexOf(i) === -1) { montagem.push(i); desenhar(); }
  }));

  function verificar() {
    const resposta = montagem.map((i) => q.blocos[i]).join(' ');
    const acertou = resposta === certa;
    linha.classList.add(acertou ? 'certa' : 'errada');
    linha.querySelectorAll('.bloco').forEach((b) => { b.disabled = true; });
    banco.querySelectorAll('.bloco').forEach((b) => { b.disabled = true; });
    registrar(q, resposta, certa, acertou);
  }

  desenhar();
}

/* ---- Fase 3: escrever ---- */
function montarFase3(q) {
  const certa = frase(q.tipo, q.h);
  const area = $('area-resposta');
  area.innerHTML =
    '<input class="campo-escrita" id="campo-escrita" type="text" maxlength="40" ' +
    'placeholder="write here..." autocomplete="off" autocapitalize="off" spellcheck="false">' +
    '<p class="ajuda-teclado">Escreva em inglês, por extenso. Exemplo: <b>half past four</b></p>';

  const campo = $('campo-escrita');
  campo.focus();
  campo.addEventListener('input', () => {
    $('btn-principal').disabled = campo.value.trim().length < 3;
  });
  campo.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !$('btn-principal').disabled) { ev.preventDefault(); verificar(); }
  });

  function verificar() {
    const escrito = campo.value.trim();
    const acertou = normalizar(escrito) === normalizar(certa);
    campo.classList.add(acertou ? 'certa' : 'errada');
    campo.disabled = true;
    const quase = !acertou && distancia(normalizar(escrito), normalizar(certa)) <= 2;
    registrar(q, escrito, certa, acertou, quase ? 'Quase! Faltou só a escrita certinha:' : null);
  }

  configurarBotao('Verificar', verificar, false);
}

/* ---- Fase 4: checar se a frase está certa ---- */
function montarFase4(q) {
  const certa = frase(q.tipo, q.h);
  const area = $('area-resposta');
  area.innerHTML =
    '<p class="frase-checagem">"' + q.mostrada + '"</p>' +
    '<div class="botoes-checagem">' +
      '<button type="button" class="botao-check sim" data-v="sim"><span class="icone">✔</span>Está CERTO</button>' +
      '<button type="button" class="botao-check nao" data-v="nao"><span class="icone">✘</span>Está ERRADO</button>' +
    '</div>';
  configurarBotao('', null, false);
  $('btn-principal').hidden = true;

  area.querySelectorAll('.botao-check').forEach((botao) => {
    botao.addEventListener('click', () => {
      const disseCerto = botao.dataset.v === 'sim';
      const acertou = disseCerto === !!q.certa;
      area.querySelectorAll('.botao-check').forEach((b) => { b.disabled = true; });
      botao.classList.add(acertou ? 'escolhido-certo' : 'escolhido-errado');
      const extra = q.certa
        ? 'A frase estava certa. ✔'
        : 'A frase estava errada. O certo é:';
      registrar(q, disseCerto ? 'disse que estava certo' : 'disse que estava errado',
                certa, acertou, extra);
    });
  });
}

/* ---- guardar a resposta e mostrar o retorno ---- */
function registrar(q, resposta, correta, acertou, mensagemExtra) {
  const chave = FASES[estado.fase].chave;
  estado.respostas[chave][estado.indice] = {
    i: estado.indice, tipo: q.tipo, h: q.h,
    resposta: String(resposta), correta: correta, acertou: !!acertou,
    quando: new Date().toISOString()
  };

  const fb = $('feedback');
  fb.hidden = false;
  fb.className = 'feedback ' + (acertou ? 'certo' : 'errado');
  if (acertou) {
    const elogios = ['Very good! 🎉', 'Excellent! ⭐', 'Perfect! 👏', 'Well done! 🌟'];
    fb.innerHTML = elogios[Math.floor(Math.random() * elogios.length)] +
      (estado.fase === 4 ? '<span class="resposta">' + (mensagemExtra || '') + '</span>' : '');
  } else {
    fb.innerHTML = (mensagemExtra || 'A resposta certa é:') + '<span class="resposta">' + correta + '</span>';
  }

  apitar(acertou);
  $('placar').textContent = acertosTotais() + ' acertos';
  configurarBotao('Próxima →', proximaPergunta, true);
  $('btn-principal').hidden = false;
  salvarEmBreve();
}

function proximaPergunta() {
  estado.indice++;
  const total = estado.perguntas[FASES[estado.fase].chave].length;
  if (estado.indice >= total) { terminarFase(); } else { renderizar(); }
  salvar();
}

function terminarFase() {
  const faseFeita = estado.fase;
  const chave = FASES[faseFeita].chave;
  const total = estado.perguntas[chave].length;
  const certas = acertosDaFase(chave);

  estado.fase = faseFeita + 1;
  estado.indice = 0;
  if (estado.fase > 4) estado.concluido = true;
  salvar();

  if (estado.fase > 4) return mostrarFim();

  const proporcao = certas / total;
  $('selo-intervalo').textContent = proporcao >= 0.8 ? '🏅' : proporcao >= 0.5 ? '⭐' : '💪';
  $('titulo-intervalo').textContent = 'Fase ' + faseFeita + ' concluída!';
  $('nota-intervalo').textContent = 'Você acertou ' + certas + ' de ' + total + '.';
  $('proxima-intervalo').innerHTML = 'Agora vem a <b>Fase ' + estado.fase + ': ' +
    FASES[estado.fase].nome + '</b><br>' + FASES[estado.fase].dica;
  mostrarTela('tela-intervalo');
}

/* ============================== RESULTADO =============================== */
function mostrarFim() {
  estado.concluido = true;
  const total = estado.totais.geral;
  const certas = acertosTotais();

  $('nome-fim').textContent = estado.nome.split(' ')[0];
  $('nota-final').textContent = 'Você acertou ' + certas + ' de ' + total + ' (' +
    Math.round(certas / total * 100) + '%).';
  $('selo-fim').textContent = certas / total >= 0.8 ? '🏆' : certas / total >= 0.5 ? '⭐' : '💪';

  $('grade-fases').innerHTML = [1, 2, 3, 4].map((n) => {
    const chave = FASES[n].chave;
    return '<div class="caixa-fase"><b>Fase ' + n + ' — ' + FASES[n].nome + '</b>' +
           '<span>' + acertosDaFase(chave) + ' / ' + estado.perguntas[chave].length + '</span></div>';
  }).join('');

  const erros = [];
  ['f1','f2','f3','f4'].forEach((k) => {
    (estado.respostas[k] || []).forEach((r) => { if (r && !r.acertou) erros.push(r); });
  });
  $('lista-erros').innerHTML = erros.length
    ? erros.map((r) => '<div class="erro-item">' +
        '<span class="voce">você respondeu: ' + r.resposta + '</span>' +
        '<span class="certo">' + r.correta + '</span></div>').join('')
    : '<div class="sem-erros">Você não errou nenhuma! Congratulations! 🎉</div>';

  mostrarTela('tela-fim');
  salvar();
}

/* nome já digitado antes neste computador: adianta o preenchimento */
try {
  const antigo = JSON.parse(localStorage.getItem('prova-relogios') || 'null');
  if (antigo && antigo.nome) {
    $('campo-nome').value = antigo.nome;
    $('campo-turma').value = antigo.turma || '';
  }
} catch (e) {}
