# RefineAI

MCP server for AI-powered technical refinements. Gives your AI assistant tools to clone Git repositories, analyze code, and generate structured refinement specs as markdown — all without leaving your existing AI client.

## Installation

Clone the repo and build once:

```bash
git clone git@github.com:jefersondeoliveira/refine-ai.git
cd refine-ai
npm install
```

> `npm install` compiles TypeScript automatically via the `prepare` script.
> The compiled output ends up in `dist/server.js`.

---

## Client Configuration

Each client needs the **absolute path** to `dist/server.js` on your machine.
Replace `/path/to/refine-ai` with wherever you cloned the repo.

### GitHub Copilot (VS Code)

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "refina-ai": {
      "command": "node",
      "args": ["/path/to/refine-ai/dist/server.js"]
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "refina-ai": {
      "command": "node",
      "args": ["/path/to/refine-ai/dist/server.js"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add refina-ai -- node /path/to/refine-ai/dist/server.js
```

### Devin CLI

Add to your Devin project configuration:

```json
{
  "mcp": {
    "refina-ai": {
      "command": "node",
      "args": ["/path/to/refine-ai/dist/server.js"]
    }
  }
}
```

---

## How to use

Once configured, just talk to your AI assistant naturally:

> "Temos uma demanda pra adicionar autenticação JWT no gateway. Aqui está a transcrição: [...]. Os repos são gitlab.corp/api-gateway e gitlab.corp/auth-service"

The AI calls the RefineAI tools automatically — clones the repos, explores the code, finds affected files, and generates the spec.

---

## Updating

To get the latest version:

```bash
cd refine-ai
git pull
npm install
```

---

## Available Tools

| Tool | Description |
|------|-------------|
| `set_refinement_context` | Store meeting transcript and session metadata |
| `clone_repository` | Clone a Git repo to local cache |
| `get_repo_structure` | View directory tree of a cloned repo |
| `read_file` | Read a file from a cloned repo (truncates at 50KB) |
| `search_in_repo` | Search files by regex pattern |
| `list_cloned_repos` | List repos cloned in this session |
| `save_artifact` | Save generated markdown to workspace |
| `list_artifacts` | List artifacts saved in this session |

---

## Skill (Workflow Instructions)

The `skills/start-refinement.md` file tells your AI assistant *how* to use the RefineAI tools — in what order, what to look for, and what spec format to generate. It covers backend, web frontend, Android, and iOS.

### Claude Code

```bash
cp /path/to/refine-ai/skills/start-refinement.md ~/.claude/plugins/refina-ai/skills/
```

### Cursor

Add to `.cursorrules` in your project root:

```
When the user asks for a refinement or technical spec, follow the workflow in /path/to/refine-ai/skills/start-refinement.md
```

### GitHub Copilot

Add to `.github/copilot-instructions.md`:

```
When conducting technical refinements, follow the workflow in /path/to/refine-ai/skills/start-refinement.md
```

---

## Cache

Repos are cached at `~/.refina-ai/cache/`. Within a session, the same repo is not re-cloned. Cached repos are also reused across sessions to avoid redundant network clones — delete `~/.refina-ai/cache/` to force a fresh clone.
