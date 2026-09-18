# O'clock Activity — half past / quarter past / quarter to

Circuito de provas de **horas em inglês** para o 4º ano do ensino fundamental.

**No ar:** <https://iapetec.github.io/oclock-activity/>
(painel da professora: <https://iapetec.github.io/oclock-activity/painel.html>)

As telas ficam no GitHub Pages e a **pontuação dos alunos vai para uma planilha do
Google Sheets**, por um web app do Apps Script. O aluno só digita o nome — não
precisa de conta Google nem de instalar nada.

O mesmo código continua rodando **offline** na rede da escola (`node server.js`),
para o caso de a internet cair: basta deixar `API` vazio em `public/config.js`.

Feito para aulas em que os alunos estudam as três formas de dizer as horas:

| Frase | Relógio |
|---|---|
| `half past three` | 3:30 |
| `quarter past three` | 3:15 |
| `quarter to three` | 2:45 |

---

## Como usar na aula (online)

1. A professora manda o endereço para os alunos:
   **<https://iapetec.github.io/oclock-activity/>**
2. Abre o **painel** em <https://iapetec.github.io/oclock-activity/painel.html>
   e digita a senha do painel para acompanhar a turma ao vivo.
3. As notas caem na planilha do Google Sheets da conta que publicou o Apps Script
   (o botão *"Abrir a planilha"* no painel leva direto nela).

---

## Como usar offline (rede local da escola)

Antes, deixe `API: ''` em `public/config.js` — assim o site salva no próprio
computador, sem internet.

**Pré-requisito:** [Node.js](https://nodejs.org) instalado (versão 18 ou mais nova).
Não há nenhuma dependência para instalar — o servidor usa só a biblioteca padrão.

### Windows

Dois cliques em **`INICIAR PROVA.bat`**. Abre a janela do servidor e o painel no
navegador. A janela precisa ficar aberta durante a aula.

### Qualquer sistema

```bash
node server.js
```

O servidor imprime os endereços:

```
Neste computador:      http://localhost:8080
Para os alunos:        http://192.168.0.15:8080
Painel da professora:  http://localhost:8080/painel
```

O endereço com o IP é o que os alunos digitam, de outro aparelho ligado no
**mesmo wi-fi**. Para trocar a porta: `PORT=8090 node server.js`
(no Windows, `set PORT=8090 && node server.js`).

---

## A prova — 34 questões em 4 fases

O aluno começa digitando o **nome** (obrigatório) e a turma.

| Fase | O que o aluno faz | Questões |
|---|---|---|
| **1 — Escolher** | Vê o relógio e clica na frase certa entre 4 opções | 12 |
| **2 — Montar** | Coloca os blocos de palavras embaralhados na ordem certa | 7 |
| **3 — Escrever** | Digita a frase em inglês | 7 |
| **4 — Checar** | Decide se a frase mostrada corresponde ao relógio | 8 |
| **Resultado** | Nota por fase e lista dos erros com a resposta certa | — |

Cada aluno recebe um **sorteio diferente**, e a Fase 1 sempre traz 4 relógios de
cada tipo (4 `half past`, 4 `quarter past`, 4 `quarter to`) em horas diferentes.
As alternativas erradas são as confusões típicas da matéria: `to` no lugar de
`past`, `half` no lugar de `quarter`, e a hora vizinha.

### Os relógios

Desenhados em SVG na hora, com números de 1 a 12, marcas de minuto, **ponteiro
pequeno (grosso, escuro) na hora** e **ponteiro grande (fino, azul) nos minutos**.
O ponteiro das horas avança junto com os minutos, como num relógio de verdade —
em `half past three` ele fica entre o 3 e o 4, não em cima do 3.

```
ângulo do ponteiro das horas   = (hora % 12) * 30 + minuto * 0.5
ângulo do ponteiro dos minutos = minuto * 6
```

### Correção da fase escrita

A resposta digitada é normalizada antes de comparar. São aceitos:

- maiúsculas e minúsculas — `Half Past Three`
- espaços sobrando e pontuação — `  half   past three. `
- algarismos no lugar da palavra — `half past 3`
- frase completa — `It's a quarter past nine`

Palavra escrita errada conta como erro, mas se faltou pouco (distância de
edição ≤ 2) o aluno recebe *"Quase! Faltou só a escrita certinha"* junto com a
forma correta.

---

## Salvamento automático

O progresso é enviado **a cada resposta**, **a cada 30 segundos** e no momento em
que a aba é fechada (`pagehide` / `visibilitychange` com `navigator.sendBeacon`).
Há ainda uma cópia em `localStorage` como reserva.

Se o aluno fechar sem querer ou faltar energia, basta digitar o mesmo nome: o site
oferece continuar de onde parou, **com as mesmas perguntas sorteadas**.

No modo online, cada aluno vira uma linha na planilha; no modo offline, um arquivo
`resultados/<nome-do-aluno>.json` gravado de forma atômica (escreve `.tmp` e
renomeia).

> Os arquivos de `resultados/` estão no `.gitignore`: nomes e notas de crianças
> não devem ir para o GitHub.

### Painel da professora — `painel.html`

Tabela com todos os alunos, a fase em que estão, acertos por fase, total, tempo e
última atualização. Atualiza sozinho a cada 20 segundos, exporta tudo em CSV
(com BOM, para o Excel abrir os acentos corretamente) e tem link para a planilha.

O painel é público como qualquer página do Pages, mas **só mostra dados depois da
senha do painel**, que fica guardada no Apps Script (propriedade `SENHA_PAINEL`) e
nunca no código do site. A senha digitada fica no `localStorage` do navegador da
professora; o botão *"Sair"* apaga.

---

## Estrutura

```
public/index.html        telas do aluno: nome, prova, fim de fase, resultado
public/app.js            relógios em SVG, as 4 fases, correção, salvamento
public/painel.html       painel da professora
public/config.js         endereço do web app (vazio = servidor local)
public/styles.css        estilo
apps-script/Code.gs      backend: grava e lê a planilha do Google Sheets
apps-script/appsscript.json  manifesto (escopo do Sheets + web app anônimo)
.github/workflows/pages.yml  publica public/ no Pages a cada push na main
server.js                servidor HTTP do modo offline, sem dependências
resultados/              um .json por aluno no modo offline (fora do git)
INICIAR PROVA.bat        atalho de duplo clique no Windows
LEIA-ME.txt              guia em português para a professora, sem termos técnicos
```

### A API (a mesma no web app e no servidor local)

| Método | Chamada | O que faz |
|---|---|---|
| `GET` | `?acao=ping` | Diz se o backend está no ar |
| `GET` | `?acao=progresso&nome=` | Devolve o progresso salvo do aluno |
| `POST` | corpo = estado em JSON | Grava o progresso (precisa de `nome`) |
| `GET` | `?acao=turma&chave=senha` | Resumo da turma + link da planilha (painel) |
| `POST` | `{"acao":"limpar","chave":"senha"}` | Zera as tres abas (só pelo painel, com confirmação) |

O `POST` vai com `Content-Type: text/plain` de propósito: com
`application/json` o navegador manda antes um pedido de permissão (*preflight*
`OPTIONS`) que o Apps Script não responde. O conteúdo continua sendo JSON.

O nome do aluno vira um *id* por um *slug* sem acentos
(`Ana Júlia Gonçalves` → `ana-julia-goncalves`). Nomes que resultam no mesmo
slug compartilham a linha — em uma turma com dois alunos de nome muito parecido,
peça o sobrenome.

---

## Como está publicado

**Telas — GitHub Pages.** O workflow `.github/workflows/pages.yml` sobe a pasta
`public/` a cada push na `main`. Nada de build, nada de dependência.

**Notas — Google Sheets por Apps Script.** O código do backend está em
`apps-script/`. Ele mesmo cria a planilha na primeira execução e guarda o id na
propriedade `PLANILHA_ID` do script, com três abas:

| Aba | O que tem |
|---|---|
| `Alunos` | uma linha por aluno: fase, acertos por fase, total, %, tempo |
| `Progresso` | o estado completo da prova em JSON, para o aluno retomar |
| `Respostas` | uma linha por questão (relógio, o que respondeu, o certo) |

A gravação é serializada por `LockService`, então a turma inteira pode salvar ao
mesmo tempo sem misturar linhas.

### Publicar uma mudança no backend

```bash
cd apps-script
clasp push --force
clasp deploy --deploymentId <id-do-deploy> --description "o que mudou"
```

Reaproveitar o **mesmo** `--deploymentId` é o que mantém o endereço do web app
(e o `public/config.js`) valendo. O deploy é *Executar como eu* + *Qualquer
pessoa, mesmo anônima* — é o que permite o aluno salvar sem conta Google.

> Na primeira vez (e sempre que mudar o `oauthScopes`), o dono do script precisa
> abrir o editor e rodar `preparar()` uma vez para autorizar o acesso à planilha.
> Sem isso, o web app responde *Acesso negado* para todo mundo.

### Zerar entre turmas

Botão **"Zerar tudo"** no painel: pede confirmação e apaga as linhas das três
abas, deixando os títulos. Não tem desfazer — o CSV do painel é o backup.

### Trocar a senha do painel

No editor do Apps Script: **Configurações do projeto → Propriedades do script →
`SENHA_PAINEL`**. Vale na hora, sem novo deploy, e o site não precisa mudar.

### Privacidade

Os dados são **nomes de crianças**. O que está exposto e o que não está:

- a prova é aberta (qualquer um pode responder e criar uma linha na planilha);
- a lista da turma só sai com a senha do painel;
- a planilha fica na conta Google da escola, com o compartilhamento que ela tiver.

---

## Testando o código

Não há suíte automatizada no repositório, mas a lógica pura de `public/app.js`
(tudo antes do bloco `ESTADO`) não toca no DOM e pode ser carregada no Node com
`vm.runInContext` para testar `frase()`, `horaDoRelogio()`, `gerarProva()`,
`normalizar()` e `relogioSVG()` sem navegador.

---

Feito para uma turma de 4º ano. Use, copie e adapte à vontade.
