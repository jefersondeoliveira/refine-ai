# RefineAI — Design Spec

**Data:** 2026-05-26
**Status:** Aprovado

---

## Visão Geral

O RefineAI é um MCP Server local escrito em TypeScript/Node.js que transforma reuniões de refinamento técnico em artefatos estruturados (markdown). Ele expõe ferramentas para clonar repositórios Git, analisar código e salvar documentação gerada.

O cliente AI do usuário (GitHub Copilot, Cursor, Claude Code, Devin CLI) conduz a conversa e chama as ferramentas automaticamente via protocolo MCP. O RefineAI não inclui modelo de IA próprio — reutiliza o modelo já configurado no ambiente do dev.

---

## Problema

Em times de engenharia:
- Demandas chegam sem contexto técnico suficiente
- Refinamentos acontecem sem análise real do código
- Riscos arquiteturais e dependências entre serviços são descobertos tarde
- Histórias são criadas sem entendimento de impacto real

---

## Solução

Um MCP Server que fornece ao modelo AI acesso direto ao código-fonte dos repositórios envolvidos numa demanda, combinado com a transcrição da reunião, para gerar especificações técnicas, análises de impacto e histórias acionáveis.

**Público-alvo:** tech leads e desenvolvedores — antes do refinamento (preparo) e depois (transformação da transcrição em artefatos).

---

## Arquitetura

```
┌─────────────────────────────────┐
│    AI Client (Copilot/Cursor)   │
│         conversa com o dev      │
└────────────┬────────────────────┘
             │ MCP protocol (stdio/HTTP)
             ▼
┌─────────────────────────────────┐
│       RefineAI MCP Server       │
│  ┌──────────┐  ┌─────────────┐  │
│  │  Tools   │  │   Context   │  │
│  │  Layer   │  │   Builder   │  │
│  └──────────┘  └─────────────┘  │
└────────────┬────────────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
┌────────┐     ┌──────────────┐
│  Git   │     │  Filesystem  │
│ (clone)│     │  (markdown)  │
└────────┘     └──────────────┘
```

O servidor roda localmente na máquina do dev. Sem serviços remotos, sem banco de dados, sem dependência de infraestrutura corporativa além do git já configurado.

---

## Ferramentas MCP

### Acesso a Repositório

| Tool | Descrição |
|------|-----------|
| `clone_repository` | Clona um repo Git numa pasta de cache local. Aceita URL + branch opcional. |
| `get_repo_structure` | Retorna a árvore de diretórios (respeita `.gitignore`, profundidade padrão: 4 níveis). |
| `read_file` | Lê um arquivo do repo clonado. Trunca acima de 50KB e avisa o modelo. |
| `search_in_repo` | Busca por regex ou texto nos arquivos — útil para achar endpoints, eventos Kafka, entidades. |
| `list_cloned_repos` | Lista repos clonados na sessão atual. |

### Geração de Artefatos

| Tool | Descrição |
|------|-----------|
| `save_artifact` | Salva markdown no workspace do usuário. Rejeita caminhos fora do diretório atual. |
| `list_artifacts` | Lista artefatos gerados na sessão. |

### Contexto de Refinamento

| Tool | Descrição |
|------|-----------|
| `set_refinement_context` | Armazena transcrição da reunião e metadados (squad, sistema, data) para uso nas análises da sessão. |

---

## Fluxo de Sessão Típico

```
Dev:  "Temos uma demanda pra adicionar autenticação JWT no gateway.
       Aqui está a transcrição: [...]. Repos: gitlab.corp/api-gateway e gitlab.corp/auth-service"

AI:   → set_refinement_context (transcrição + repos)
      → clone_repository (api-gateway)
      → clone_repository (auth-service)
      → get_repo_structure (ambos)
      → search_in_repo "JWT|auth|token"
      → read_file (arquivos relevantes)
      → responde com findings iniciais

Dev:  "Quais endpoints são afetados?"
AI:   → search_in_repo "routes|controller|handler"
      → responde com lista de endpoints

Dev:  "Gera o spec completo"
AI:   → save_artifact "specs/2026-05-26-jwt-gateway.md"
```

---

## Gerenciamento de Cache

- Repos clonados ficam em `~/.refine-ai/cache/<hash-url>/`
- Reutilizados dentro da mesma sessão (sem novo clone)
- Sem cache persistente entre sessões no MVP — sempre fresh

---

## Tratamento de Erros

| Situação | Comportamento |
|----------|---------------|
| `git clone` falha (URL inválida, sem permissão) | Retorna erro descritivo — modelo avisa o dev |
| Arquivo não encontrado | Erro com sugestão de usar `get_repo_structure` primeiro |
| Arquivo >50KB | Conteúdo truncado + aviso explícito |
| `read_file` em repo não clonado | Erro pedindo clone primeiro |
| `save_artifact` fora do workspace | Rejeitado — sem escrita fora do diretório atual |
| Contexto não definido | Ferramentas funcionam, mas sem transcrição como referência |

---

## Estrutura do Projeto

```
refina-ai/
├── src/
│   ├── server.ts          # Entry point — inicializa o MCP server
│   ├── tools/
│   │   ├── repository.ts  # clone_repository, get_repo_structure, read_file, search_in_repo, list_cloned_repos
│   │   ├── artifacts.ts   # save_artifact, list_artifacts
│   │   └── context.ts     # set_refinement_context
│   ├── lib/
│   │   ├── git.ts         # wrapper sobre git CLI
│   │   ├── fs.ts          # leitura, escrita, truncamento
│   │   └── cache.ts       # gerenciamento de ~/.refine-ai/cache
│   └── types.ts           # tipos compartilhados
├── package.json
├── tsconfig.json
└── README.md              # instalação + config por cliente (Copilot, Cursor, Claude Code, Devin)
```

---

## Stack

- **Runtime:** Node.js + TypeScript
- **MCP:** `@modelcontextprotocol/sdk` (SDK oficial)
- **Git:** `simple-git` (wrapper Node.js)
- **Sem banco de dados, sem dependências pesadas**

---

## Distribuição

```bash
npm install -g refina-ai
# ou
npx refina-ai
```

O `README.md` inclui snippets de configuração prontos para:
- GitHub Copilot (agent mode)
- Cursor
- Claude Code
- Devin CLI

---

## Testes

- **Unitários:** cada tool isolada com mocks de `git` e `fs`
- **Integração:** fluxo completo com repo Git real (o próprio repo do projeto)
- Sem testes de contrato MCP no MVP — o SDK valida o protocolo

---

## Fora do Escopo (MVP)

- Integração com Jira / Azure DevOps / Linear
- Cache persistente entre sessões
- Interface visual / web UI
- Indexação RAG de documentação interna
- Memória organizacional
