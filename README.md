# O'clock Activity — half past / quarter past / quarter to

Circuito de provas de **horas em inglês** para o 4º ano do ensino fundamental.
Roda no computador da professora e os alunos acessam pelo navegador, na rede local
da escola. Sem internet, sem nuvem, sem conta: o progresso é salvo automaticamente
em arquivo na máquina da professora.

Feito para aulas em que os alunos estudam as três formas de dizer as horas:

| Frase | Relógio |
|---|---|
| `half past three` | 3:30 |
| `quarter past three` | 3:15 |
| `quarter to three` | 2:45 |

---

## Como usar

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

O progresso vai para o servidor **a cada resposta**, **a cada 30 segundos** e no
momento em que a aba é fechada (`pagehide` / `visibilitychange` com
`navigator.sendBeacon`). Há ainda uma cópia em `localStorage` como reserva.

Cada aluno vira um arquivo em `resultados/<nome-do-aluno>.json`, gravado de forma
atômica (escreve `.tmp` e renomeia). Se o aluno fechar sem querer ou faltar
energia, basta digitar o mesmo nome: o site oferece continuar de onde parou,
**com as mesmas perguntas sorteadas**.

> Os arquivos de `resultados/` estão no `.gitignore`: nomes e notas de crianças
> não devem ir para o GitHub.

### Painel da professora — `/painel`

Tabela com todos os alunos, a fase em que estão, acertos por fase, total, tempo e
última atualização. Atualiza sozinho a cada 15 segundos e exporta tudo em CSV
(com BOM, para o Excel abrir os acentos corretamente).

---

## Estrutura

```
server.js            servidor HTTP, sem dependências (~200 linhas)
public/index.html    telas do aluno: nome, prova, fim de fase, resultado
public/app.js        relógios em SVG, geração das 4 fases, correção, salvamento
public/painel.html   painel da professora
public/styles.css    estilo
resultados/          um .json por aluno (fora do controle de versão)
INICIAR PROVA.bat    atalho de duplo clique no Windows
LEIA-ME.txt          guia em português para a professora, sem termos técnicos
```

### Endpoints

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/api/progresso?nome=` | Devolve o progresso salvo do aluno |
| `POST` | `/api/progresso` | Grava o progresso (corpo JSON com `nome`) |
| `GET` | `/api/turma` | Resumo de todos os alunos, para o painel |
| `GET` | `/api/turma.csv` | Mesma tabela em CSV para o Excel |

O nome do aluno vira nome de arquivo por um *slug* sem acentos
(`Ana Júlia Gonçalves` → `ana-julia-goncalves.json`). Nomes que resultam no mesmo
slug compartilham o arquivo — em uma turma com dois alunos de nome muito parecido,
peça o sobrenome.

---

## Para colocar online

⚠️ **Atenção antes de publicar:** hoje quem guarda as notas é o servidor Node
rodando na máquina da professora. Num site estático (GitHub Pages, Netlify,
Vercel estático) **as rotas `/api/*` não existem** — o aluno consegue fazer a
prova, mas nada é salvo e o painel fica vazio.

Caminhos possíveis:

1. **Hospedar o servidor como está** (Render, Railway, Fly.io, uma VM).
   Funciona sem mudar o código, mas o disco desses serviços costuma ser efêmero:
   os `.json` somem no próximo *deploy*. Vale trocar a gravação em arquivo por um
   banco de verdade (SQLite com volume, Postgres, Firestore).
2. **Versão estática** (GitHub Pages): trocar as chamadas `fetch('/api/...')` em
   `public/app.js` por `localStorage`, e no fim da prova gerar um arquivo/código
   que o aluno entrega à professora. Some o painel ao vivo.
3. **Estático + backend gerenciado**: manter as telas no Pages e mandar o
   progresso para um Firebase/Supabase. É o que preserva o painel ao vivo.

Em qualquer caminho online, lembre que os dados são **nomes de crianças**:
o acesso precisa ser restrito à professora.

---

## Testando o código

Não há suíte automatizada no repositório, mas a lógica pura de `public/app.js`
(tudo antes do bloco `ESTADO`) não toca no DOM e pode ser carregada no Node com
`vm.runInContext` para testar `frase()`, `horaDoRelogio()`, `gerarProva()`,
`normalizar()` e `relogioSVG()` sem navegador.

---

Feito para uma turma de 4º ano. Use, copie e adapte à vontade.
