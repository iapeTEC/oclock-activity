/* Servidor local da Prova de Horas em Ingles (half past / quarter past / quarter to)
   Sem dependencias externas. Roda com: node server.js                             */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const PORT   = Number(process.env.PORT) || 8080;
const ROOT   = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA   = path.join(ROOT, 'resultados');

if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css' : 'text/css; charset=utf-8',
  '.js'  : 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg' : 'image/svg+xml',
  '.ico' : 'image/x-icon'
};

/* --- nome do aluno -> nome de arquivo seguro ------------------------------ */
function slug(nome) {
  return String(nome || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // tira acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'aluno';
}

function arquivoDe(nome) { return path.join(DATA, slug(nome) + '.json'); }

function lerJSON(arquivo) {
  try { return JSON.parse(fs.readFileSync(arquivo, 'utf8')); }
  catch (e) { return null; }
}

function enviarJSON(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(obj));
}

function lerCorpo(req) {
  return new Promise((resolve) => {
    let dados = '';
    req.on('data', (c) => {
      dados += c;
      if (dados.length > 2e6) req.destroy();            // limite de seguranca
    });
    req.on('end', () => {
      try { resolve(JSON.parse(dados)); } catch (e) { resolve(null); }
    });
  });
}

/* --- resumo usado pelo painel da professora ------------------------------- */
function resumo(p) {
  const conta = (k) => {
    const r = (p.respostas && p.respostas[k]) || [];
    return { feitas: r.length, certas: r.filter((x) => x && x.acertou).length };
  };
  return {
    nome: p.nome,
    turma: p.turma || '',
    arquivo: slug(p.nome) + '.json',
    faseAtual: p.fase,
    concluido: !!p.concluido,
    inicio: p.inicio,
    atualizado: p.atualizado,
    tempoMin: p.inicio && p.atualizado
      ? Math.round((new Date(p.atualizado) - new Date(p.inicio)) / 60000) : 0,
    f1: conta('f1'), f2: conta('f2'), f3: conta('f3'), f4: conta('f4'),
    total: ['f1', 'f2', 'f3', 'f4'].reduce((a, k) => a + conta(k).certas, 0),
    totalQuestoes: (p.totais && p.totais.geral) || 0
  };
}

function todosOsAlunos() {
  return fs.readdirSync(DATA)
    .filter((n) => n.endsWith('.json'))
    .map((n) => lerJSON(path.join(DATA, n)))
    .filter(Boolean)
    .map(resumo)
    .sort((a, b) => String(b.atualizado).localeCompare(String(a.atualizado)));
}

function csvDaTurma() {
  const cab = 'Nome;Turma;Fase;Concluido;Fase1;Fase2;Fase3;Fase4;Total acertos;Tempo (min);Inicio;Ultima atualizacao';
  const linhas = todosOsAlunos().map((a) => [
    a.nome, a.turma, Math.min(Number(a.faseAtual) || 1, 4), a.concluido ? 'sim' : 'nao',
    a.f1.certas + '/' + a.f1.feitas, a.f2.certas + '/' + a.f2.feitas,
    a.f3.certas + '/' + a.f3.feitas, a.f4.certas + '/' + a.f4.feitas,
    a.total, a.tempoMin, a.inicio, a.atualizado
  ].map((c) => String(c === undefined || c === null ? '' : c).replace(/;/g, ',')).join(';'));
  return '﻿' + [cab].concat(linhas).join('\r\n');
}

/* --- servidor ------------------------------------------------------------- */
const servidor = http.createServer(async (req, res) => {
  const url  = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const rota = decodeURIComponent(url.pathname);

  // progresso salvo de um aluno
  if (rota === '/api/progresso' && req.method === 'GET') {
    const dados = lerJSON(arquivoDe(url.searchParams.get('nome')));
    return enviarJSON(res, 200, { encontrado: !!dados, progresso: dados });
  }

  // salvar progresso (fetch normal, ou navigator.sendBeacon ao fechar a aba)
  if (rota === '/api/progresso' && req.method === 'POST') {
    const corpo = await lerCorpo(req);
    if (!corpo || !corpo.nome || !String(corpo.nome).trim()) {
      return enviarJSON(res, 400, { erro: 'nome obrigatorio' });
    }
    corpo.atualizado = new Date().toISOString();
    const destino  = arquivoDe(corpo.nome);
    const anterior = lerJSON(destino);
    if (anterior && anterior.inicio && !corpo.inicio) corpo.inicio = anterior.inicio;
    try {
      const tmp = destino + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(corpo, null, 2), 'utf8');
      fs.renameSync(tmp, destino);                       // gravacao atomica
      return enviarJSON(res, 200, { ok: true, arquivo: path.basename(destino) });
    } catch (e) {
      return enviarJSON(res, 500, { erro: String(e.message) });
    }
  }

  if (rota === '/api/turma' && req.method === 'GET') {
    return enviarJSON(res, 200, { alunos: todosOsAlunos() });
  }

  if (rota === '/api/turma.csv') {
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="turma.csv"'
    });
    return res.end(csvDaTurma());
  }

  if (rota === '/painel' || rota === '/painel/') {
    res.writeHead(302, { Location: '/painel.html' });
    return res.end();
  }

  // arquivos estaticos
  const alvo    = rota === '/' ? '/index.html' : rota;
  const caminho = path.join(PUBLIC, path.normalize(alvo).replace(/^[\\/]+/, ''));
  if (!caminho.startsWith(PUBLIC)) { res.writeHead(403); return res.end('proibido'); }

  fs.readFile(caminho, (erro, conteudo) => {
    if (erro) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Pagina nao encontrada');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(caminho).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(conteudo);
  });
});

function ips() {
  const lista = [];
  const redes = os.networkInterfaces();
  for (const nome of Object.keys(redes)) {
    for (const rede of redes[nome] || []) {
      if (rede.family === 'IPv4' && !rede.internal) lista.push(rede.address);
    }
  }
  return lista;
}

servidor.listen(PORT, '0.0.0.0', () => {
  const linha = '='.repeat(60);
  console.log('\n' + linha);
  console.log('   PROVA DE HORAS EM INGLES  -  servidor no ar');
  console.log(linha);
  console.log('\n   Neste computador:      http://localhost:' + PORT);
  ips().forEach((ip) => console.log('   Para os alunos:        http://' + ip + ':' + PORT));
  console.log('\n   Painel da professora:  http://localhost:' + PORT + '/painel');
  console.log('   Resultados salvos em:  ' + DATA);
  console.log('\n   Para encerrar: feche esta janela ou aperte Ctrl + C');
  console.log(linha + '\n');
});

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('\n   A porta ' + PORT + ' ja esta em uso.');
    console.error('   Feche a outra janela do servidor, ou rode:  set PORT=8090 && node server.js\n');
  } else {
    console.error(e);
  }
});
