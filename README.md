# RefineAI

MCP server for AI-powered technical refinements. Gives your AI assistant tools to clone Git repositories, analyze code, and generate structured refinement specs as markdown — all without leaving your existing AI client.

## Installation

```bash
npm install -g refina-ai
```

## How to use

Just talk to your AI assistant normally:

> "Clone https://github.com/org/api-gateway and generate a refinement spec for adding JWT authentication. Here is the meeting transcript: [paste transcript]"

The AI will call the RefineAI tools automatically.

## Client Configuration

### GitHub Copilot (VS Code)

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "refina-ai": {
      "command": "npx",
      "args": ["-y", "refina-ai"]
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
      "command": "npx",
      "args": ["-y", "refina-ai"]
    }
  }
}
```

### Claude Code

Run in your terminal:

```bash
claude mcp add refina-ai -- npx -y refina-ai
```

Or add manually to `~/.claude.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "refina-ai": {
      "command": "npx",
      "args": ["-y", "refina-ai"]
    }
  }
}
```

### Devin CLI

Add to your Devin project configuration:

```json
{
  "mcp": {
    "refina-ai": {
      "command": "npx",
      "args": ["-y", "refina-ai"]
    }
  }
}
```

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

## Skill (Workflow Instructions)

The `skills/start-refinement.md` file tells your AI assistant *how* to use the RefineAI tools — in what order, what to look for, and what format to generate.

### Claude Code

```bash
# Copy to your Claude plugins directory
cp skills/start-refinement.md ~/.claude/plugins/refina-ai/skills/
```

### Cursor

Add to `.cursorrules` in your project root:

```
When the user asks for a refinement or technical spec, follow the workflow in node_modules/refina-ai/skills/start-refinement.md
```

### GitHub Copilot

Add to `.github/copilot-instructions.md`:

```
When conducting technical refinements, follow the workflow in node_modules/refina-ai/skills/start-refinement.md
```

## Cache

Repos are cached at `~/.refina-ai/cache/`. Within a session, the same repo is not re-cloned. Cached repos are also reused across sessions to avoid redundant network clones — delete `~/.refina-ai/cache/` to force a fresh clone.
