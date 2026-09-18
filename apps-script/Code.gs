/* ============================================================================
   Prova de Horas em Ingles (4o ano) — backend em Google Sheets
   Web app publicado por Apps Script. O front-end (GitHub Pages) fala com
   este script por GET (ler) e POST (salvar).

   Abas criadas automaticamente na planilha:
     Alunos      -> uma linha por aluno, com a pontuacao de cada fase
     Progresso   -> estado completo da prova (para o aluno retomar)
     Respostas   -> uma linha por questao respondida (gravada no fim da prova)
   ========================================================================== */

var VERSAO         = '1.0.0';
var ABA_ALUNOS     = 'Alunos';
var ABA_PROGRESSO  = 'Progresso';
var ABA_RESPOSTAS  = 'Respostas';
var FASES          = ['f1', 'f2', 'f3', 'f4'];
var LIMITE_JSON    = 45000;   // teto de caracteres por celula (limite real: 50k)

var CAB_ALUNOS = ['Nome', 'Turma', 'Fase', 'Concluido',
                  'Fase 1 (escolher)', 'Fase 2 (montar)', 'Fase 3 (escrever)', 'Fase 4 (checar)',
                  'Acertos', 'Questoes', 'Aproveitamento', 'Tempo (min)',
                  'Inicio', 'Ultima atualizacao', 'Id'];
var CAB_PROGRESSO = ['Id', 'Nome', 'Atualizado', 'Estado (JSON)'];
var CAB_RESPOSTAS = ['Id', 'Nome', 'Turma', 'Fase', 'Questao', 'Relogio',
                     'Resposta do aluno', 'Resposta certa', 'Acertou', 'Quando'];

/* ------------------------------------------------------- utilidades basicas */

function props() { return PropertiesService.getScriptProperties(); }

function texto(v) { return v === undefined || v === null ? '' : String(v); }

/* nome do aluno -> identificador estavel (sem acento, sem espaco) */
function idDe(nome) {
  return texto(nome)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'aluno';
}

function responder(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------ planilha ---- */

function planilha() {
  var id = props().getProperty('PLANILHA_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* recria abaixo */ }
  }
  var nova = SpreadsheetApp.create('Prova de Horas em Ingles — 4o ano (resultados)');
  props().setProperty('PLANILHA_ID', nova.getId());
  var primeira = nova.getSheets()[0];
  primeira.setName(ABA_ALUNOS);
  cabecalho(primeira, CAB_ALUNOS);
  cabecalho(nova.insertSheet(ABA_PROGRESSO), CAB_PROGRESSO);
  cabecalho(nova.insertSheet(ABA_RESPOSTAS), CAB_RESPOSTAS);
  return nova;
}

function cabecalho(aba, cab) {
  aba.getRange(1, 1, 1, cab.length).setValues([cab])
     .setFontWeight('bold').setBackground('#f2f7fd');
  aba.setFrozenRows(1);
  if (aba.getMaxColumns() > cab.length) {
    aba.deleteColumns(cab.length + 1, aba.getMaxColumns() - cab.length);
  }
  return aba;
}

function aba(nome, cab) {
  var ss = planilha();
  var a  = ss.getSheetByName(nome);
  if (!a) a = cabecalho(ss.insertSheet(nome), cab);
  return a;
}

/* devolve a linha (1-based) cujo Id esta na coluna informada, ou 0 */
function linhaDoId(a, id, coluna) {
  var ultima = a.getLastRow();
  if (ultima < 2) return 0;
  var ids = a.getRange(2, coluna, ultima - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (texto(ids[i][0]) === id) return i + 2;
  }
  return 0;
}

/* --------------------------------------------------------------- resumo --- */

function contaFase(p, chave) {
  var r = (p.respostas && p.respostas[chave]) || [];
  var feitas = 0, certas = 0;
  for (var i = 0; i < r.length; i++) {
    if (!r[i]) continue;
    feitas++;
    if (r[i].acertou) certas++;
  }
  return { feitas: feitas, certas: certas };
}

function resumo(p) {
  var c = {}, total = 0;
  for (var i = 0; i < FASES.length; i++) {
    c[FASES[i]] = contaFase(p, FASES[i]);
    total += c[FASES[i]].certas;
  }
  var questoes = (p.totais && p.totais.geral) || 0;
  var minutos  = (p.inicio && p.atualizado)
    ? Math.max(0, Math.round((new Date(p.atualizado) - new Date(p.inicio)) / 60000)) : 0;
  return {
    id: idDe(p.nome), nome: texto(p.nome), turma: texto(p.turma),
    faseAtual: Math.min(Number(p.fase) || 1, 4),
    concluido: !!p.concluido,
    inicio: texto(p.inicio), atualizado: texto(p.atualizado), tempoMin: minutos,
    f1: c.f1, f2: c.f2, f3: c.f3, f4: c.f4,
    total: total, totalQuestoes: questoes
  };
}

function linhaAlunos(r) {
  var par = function (f) { return f.feitas ? f.certas + ' / ' + f.feitas : '—'; };
  return [
    r.nome, r.turma, r.faseAtual, r.concluido ? 'sim' : 'nao',
    par(r.f1), par(r.f2), par(r.f3), par(r.f4),
    r.total, r.totalQuestoes,
    r.totalQuestoes ? Math.round(r.total / r.totalQuestoes * 100) + '%' : '—',
    r.tempoMin, r.inicio, r.atualizado, r.id
  ];
}

/* ---------------------------------------------------------------- salvar -- */

function salvarProgresso(p) {
  if (!p || !texto(p.nome).trim()) throw new Error('nome obrigatorio');
  p.nome  = texto(p.nome).trim().replace(/\s+/g, ' ').slice(0, 60);
  p.turma = texto(p.turma).trim().slice(0, 30);

  var id    = idDe(p.nome);
  var trava = LockService.getScriptLock();
  trava.waitLock(25000);
  try {
    var prog = aba(ABA_PROGRESSO, CAB_PROGRESSO);
    var alun = aba(ABA_ALUNOS, CAB_ALUNOS);

    /* mantem o horario de inicio da primeira tentativa */
    var linhaProg = linhaDoId(prog, id, 1);
    var anterior  = null;
    if (linhaProg) {
      try { anterior = JSON.parse(prog.getRange(linhaProg, 4).getValue()); } catch (e) {}
    }
    if (anterior && anterior.inicio && !p.inicio) p.inicio = anterior.inicio;
    p.atualizado = new Date().toISOString();

    var json = JSON.stringify(p);
    if (json.length > LIMITE_JSON) throw new Error('progresso grande demais');

    var linha = [id, p.nome, p.atualizado, json];
    if (linhaProg) prog.getRange(linhaProg, 1, 1, linha.length).setValues([linha]);
    else           prog.appendRow(linha);

    var r         = resumo(p);
    var linhaAlun = linhaDoId(alun, id, CAB_ALUNOS.length);
    var valores   = linhaAlunos(r);
    var jaEstava  = false;
    if (linhaAlun) {
      jaEstava = texto(alun.getRange(linhaAlun, 4).getValue()) === 'sim';
      alun.getRange(linhaAlun, 1, 1, valores.length).setValues([valores]);
    } else {
      alun.appendRow(valores);
    }

    /* detalhe questao por questao: grava quando o aluno termina */
    if (r.concluido && (!jaEstava || !linhaAlun)) gravarRespostas(id, p, r);

    return { ok: true, id: id, resumo: r };
  } finally {
    trava.releaseLock();
  }
}

function gravarRespostas(id, p, r) {
  var a = aba(ABA_RESPOSTAS, CAB_RESPOSTAS);

  /* apaga o que esse aluno tinha (caso tenha refeito a prova) */
  var ultima = a.getLastRow();
  if (ultima > 1) {
    var ids = a.getRange(2, 1, ultima - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) {
      if (texto(ids[i][0]) === id) a.deleteRow(i + 2);
    }
  }

  var novas = [];
  for (var f = 0; f < FASES.length; f++) {
    var lista = (p.respostas && p.respostas[FASES[f]]) || [];
    for (var q = 0; q < lista.length; q++) {
      var resp = lista[q];
      if (!resp) continue;
      novas.push([
        id, r.nome, r.turma, f + 1, q + 1,
        relogioDe(resp.tipo, resp.h),
        texto(resp.resposta).slice(0, 300),
        texto(resp.correta).slice(0, 300),
        resp.acertou ? 'sim' : 'nao',
        texto(resp.quando)
      ]);
    }
  }
  if (novas.length) {
    a.getRange(a.getLastRow() + 1, 1, novas.length, CAB_RESPOSTAS.length).setValues(novas);
  }
}

/* hora que o relogio mostrava na questao (mesma regra do front-end) */
function relogioDe(tipo, h) {
  h = Number(h);
  if (!h) return '';
  if (tipo === 'half') return h + ':30';
  if (tipo === 'past') return h + ':15';
  if (tipo === 'to')   return (h === 1 ? 12 : h - 1) + ':45';
  return '';
}

/* ------------------------------------------------------------------ ler --- */

function lerProgresso(nome) {
  var id = idDe(nome);
  var a  = aba(ABA_PROGRESSO, CAB_PROGRESSO);
  var linha = linhaDoId(a, id, 1);
  if (!linha) return { encontrado: false, progresso: null };
  try {
    return { encontrado: true, progresso: JSON.parse(a.getRange(linha, 4).getValue()) };
  } catch (e) {
    return { encontrado: false, progresso: null };
  }
}

function turma() {
  var a = aba(ABA_PROGRESSO, CAB_PROGRESSO);
  var ultima = a.getLastRow();
  var alunos = [];
  if (ultima > 1) {
    var linhas = a.getRange(2, 1, ultima - 1, CAB_PROGRESSO.length).getValues();
    for (var i = 0; i < linhas.length; i++) {
      try { alunos.push(resumo(JSON.parse(linhas[i][3]))); } catch (e) {}
    }
  }
  alunos.sort(function (x, y) { return texto(y.atualizado).localeCompare(texto(x.atualizado)); });
  return alunos;
}

/* ------------------------------------------------------------- seguranca -- */

function senhaPainel() {
  var s = props().getProperty('SENHA_PAINEL');
  if (!s) { s = 'iape2026'; props().setProperty('SENHA_PAINEL', s); }
  return s;
}

function painelLiberado(e) {
  var enviada = (e && e.parameter && e.parameter.chave) || '';
  return texto(enviada) === senhaPainel();
}

/* --------------------------------------------------------------- rotas ---- */

function doGet(e) {
  try {
    var p    = (e && e.parameter) || {};
    var acao = p.acao || 'ping';

    if (acao === 'ping') {
      return responder({ ok: true, versao: VERSAO, servico: 'prova-horas' });
    }
    if (acao === 'progresso') {
      return responder(lerProgresso(p.nome));
    }
    if (acao === 'turma') {
      if (!painelLiberado(e)) return responder({ erro: 'senha do painel incorreta' });
      return responder({ alunos: turma(), planilha: planilha().getUrl() });
    }
    if (acao === 'planilha') {
      if (!painelLiberado(e)) return responder({ erro: 'senha do painel incorreta' });
      return responder({ url: planilha().getUrl() });
    }
    return responder({ erro: 'acao desconhecida: ' + acao });
  } catch (erro) {
    return responder({ erro: String(erro && erro.message || erro) });
  }
}

function doPost(e) {
  try {
    var corpo = null;
    if (e && e.postData && e.postData.contents) corpo = JSON.parse(e.postData.contents);
    else if (e && e.parameter && e.parameter.dados) corpo = JSON.parse(e.parameter.dados);
    if (!corpo) return responder({ erro: 'corpo vazio' });
    return responder(salvarProgresso(corpo));
  } catch (erro) {
    return responder({ erro: String(erro && erro.message || erro) });
  }
}

/* rodar uma vez no editor para autorizar e ver o link da planilha */
function preparar() {
  var ss = planilha();
  aba(ABA_ALUNOS, CAB_ALUNOS);
  aba(ABA_PROGRESSO, CAB_PROGRESSO);
  aba(ABA_RESPOSTAS, CAB_RESPOSTAS);
  senhaPainel();
  Logger.log('Planilha: ' + ss.getUrl());
  return ss.getUrl();
}
