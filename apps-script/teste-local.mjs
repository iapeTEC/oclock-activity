/* ============================================================================
   Testa o Code.gs sem tocar no Google: simula SpreadsheetApp, LockService e
   PropertiesService em memoria. Roda com:  node apps-script/teste-local.mjs

   Serve para conferir a logica (resumo das fases, guarda contra salvamento
   fora de ordem, refazer a prova) sem gastar a cota diaria do Apps Script.
   ========================================================================== */

import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

/* ---------------------------------------------------- planilha de mentira */
function criarAba(nome) {
  const celulas = [];                        // celulas[linha][coluna], base 0
  const aba = {
    getName: () => nome,
    getMaxColumns: () => 26,
    getMaxRows: () => 1000,
    getLastRow: () => celulas.length,
    deleteColumns: () => aba,
    setFrozenRows: () => aba,
    setName: (n) => { nome = n; return aba; },
    deleteRow: (linha) => { celulas.splice(linha - 1, 1); return aba; },
    appendRow: (valores) => { celulas.push(valores.slice()); return aba; },
    getDataRange: () => aba.getRange(1, 1, Math.max(celulas.length, 1), 26),
    getRange: (linha, coluna, nLinhas = 1, nColunas = 1) => ({
      getValue: () => (celulas[linha - 1] || [])[coluna - 1] ?? '',
      getValues: () => {
        const saida = [];
        for (let i = 0; i < nLinhas; i++) {
          const atual = celulas[linha - 1 + i] || [];
          saida.push(Array.from({ length: nColunas }, (_, j) => atual[coluna - 1 + j] ?? ''));
        }
        return saida;
      },
      setValues: (valores) => {
        valores.forEach((linhaValores, i) => {
          const alvo = linha - 1 + i;
          while (celulas.length <= alvo) celulas.push([]);
          linhaValores.forEach((v, j) => { celulas[alvo][coluna - 1 + j] = v; });
        });
        return { setFontWeight: () => ({ setBackground: () => {} }) };
      }
    })
  };
  aba.celulas = celulas;
  return aba;
}

function criarPlanilha(titulo) {
  const abas = [criarAba('Sheet1')];
  return {
    getId: () => 'planilha-de-teste',
    getUrl: () => 'https://exemplo/planilha-de-teste',
    getName: () => titulo,
    getSheets: () => abas,
    getSheetByName: (n) => abas.find((a) => a.getName() === n) || null,
    insertSheet: (n) => { const a = criarAba(n); abas.push(a); return a; },
    abas
  };
}

let planilhaUnica = null;
const propriedades = new Map();

const ambiente = {
  SpreadsheetApp: {
    create: (titulo) => { planilhaUnica = criarPlanilha(titulo); return planilhaUnica; },
    openById: (id) => { if (!planilhaUnica) throw new Error('nao existe: ' + id); return planilhaUnica; }
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (k) => (propriedades.has(k) ? propriedades.get(k) : null),
      setProperty: (k, v) => propriedades.set(k, v)
    })
  },
  LockService: { getScriptLock: () => ({ waitLock: () => true, releaseLock: () => true }) },
  ContentService: {
    MimeType: { JSON: 'json' },
    createTextOutput: (texto) => ({ setMimeType: () => ({ getContent: () => texto }) })
  },
  Logger: { log: () => {} },
  console
};

const aqui = path.dirname(new URL(import.meta.url).pathname);
const codigo = readFileSync(path.join(aqui, 'Code.gs'), 'utf8');
const contexto = vm.createContext(ambiente);
vm.runInContext(codigo, contexto);
const { doGet, doPost } = contexto;

/* --------------------------------------------------------------- ajudantes */
let falhas = 0;
function conferir(oque, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? '  ok   ' : '  FALHOU ') + oque +
    (ok ? '' : '\n         obtido:   ' + JSON.stringify(obtido) +
               '\n         esperado: ' + JSON.stringify(esperado)));
}

const resposta = (certa) => ({
  tipo: 'half', h: 4, resposta: certa ? 'half past four' : 'half past one',
  correta: 'half past four', acertou: certa, quando: '2026-09-18T18:00:00.000Z'
});

function estado(quantas, extra = {}) {
  const respostas = { f1: [], f2: [], f3: [], f4: [] };
  for (let i = 0; i < quantas; i++) respostas.f1.push(resposta(i % 4 !== 1));
  return {
    versao: 1, nome: 'Ana Júlia Gonçalves', turma: '4º ano B',
    inicio: '2026-09-18T18:00:00.000Z', fase: 1, indice: quantas, concluido: false,
    perguntas: { f1: new Array(12).fill({ tipo: 'half', h: 4 }), f2: [], f3: [], f4: [] },
    respostas, totais: { f1: 12, f2: 0, f3: 0, f4: 0, geral: 12 },
    ...extra
  };
}

const post = (corpo) => JSON.parse(doPost({ postData: { contents: JSON.stringify(corpo) } }).getContent());
const get  = (parametro) => JSON.parse(doGet({ parameter: parametro }).getContent());

/* ------------------------------------------------------------------ testes */
console.log('\nBackend da prova de horas — testes sem Google\n');

conferir('ping responde', get({ acao: 'ping' }).ok, true);
conferir('acao desconhecida avisa', !!get({ acao: 'xpto' }).erro, true);
conferir('nome vazio e recusado', !!post({ nome: '  ' }).erro, true);

conferir('salva a primeira leva', post(estado(5)).ok, true);
conferir('turma pede senha', !!get({ acao: 'turma' }).erro, true);

const turma1 = get({ acao: 'turma', chave: 'iape2026' });
conferir('turma com senha lista 1 aluno', turma1.alunos.length, 1);
conferir('acertos contados certo (5 respostas, 1 errada)', turma1.alunos[0].total, 4);
conferir('id sem acento', turma1.alunos[0].id, 'ana-julia-goncalves');

conferir('salva a segunda leva', post(estado(9)).ok, true);
conferir('progresso volta com 9 respostas',
  get({ acao: 'progresso', nome: 'Ana Júlia Gonçalves' }).progresso.respostas.f1.length, 9);

const atrasado = post(estado(5));
conferir('salvamento atrasado e recusado', atrasado.ignorado, 'chegou fora de ordem');
conferir('planilha continua com 9 respostas',
  get({ acao: 'progresso', nome: 'Ana Júlia Gonçalves' }).progresso.respostas.f1.length, 9);

const refeita = estado(2, { inicio: '2026-09-18T19:00:00.000Z' });
conferir('tentativa nova (outro inicio) passa', post(refeita).ok, true);
conferir('planilha aceitou a prova refeita',
  get({ acao: 'progresso', nome: 'Ana Júlia Gonçalves' }).progresso.respostas.f1.length, 2);

const fim = estado(12, { concluido: true, fase: 5, inicio: '2026-09-18T19:00:00.000Z' });
conferir('conclusao salva', post(fim).ok, true);
const planilha = planilhaUnica;
const respostasAba = planilha.getSheetByName('Respostas');
conferir('aba Respostas tem cabecalho + 12 questoes', respostasAba.getLastRow(), 13);
conferir('relogio da questao foi calculado', respostasAba.getRange(2, 6).getValue(), '4:30');
conferir('turma mostra concluido', get({ acao: 'turma', chave: 'iape2026' }).alunos[0].concluido, true);

conferir('salvar de novo nao duplica as respostas', post(fim).ok, true);
conferir('aba Respostas continua com 12 questoes', respostasAba.getLastRow(), 13);

const branco = estado(0, { inicio: '2026-09-18T20:00:00.000Z' });
conferir('prova em branco nao apaga o que existe',
  post(branco).ignorado, 'prova em branco nao apaga o que ja existe');
conferir('planilha continua com as 12 respostas',
  get({ acao: 'progresso', nome: 'Ana Júlia Gonçalves' }).progresso.respostas.f1.length, 12);

const refazerDeProposito = estado(0, { inicio: '2026-09-18T21:00:00.000Z', refazendo: true });
conferir('"comecar tudo de novo" passa', post(refazerDeProposito).ok, true);
conferir('planilha zerou para a prova nova',
  get({ acao: 'progresso', nome: 'Ana Júlia Gonçalves' }).progresso.respostas.f1.length, 0);

const alunos = planilha.getSheetByName('Alunos');
conferir('aba Alunos tem 1 aluno', alunos.getLastRow(), 2);
conferir('aproveitamento zerado depois de refazer', alunos.getRange(2, 11).getValue(), '0%');

console.log(falhas ? '\n' + falhas + ' teste(s) falharam\n' : '\ntodos os testes passaram\n');
process.exit(falhas ? 1 : 0);
