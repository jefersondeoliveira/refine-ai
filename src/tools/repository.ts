import * as nodePath from "node:path";
import * as nodeFs from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cloneRepo } from "../lib/git.js";
import { getCachePath, ensureCacheDir } from "../lib/cache.js";
import { getDirectoryTree, readFileTruncated, searchInFiles } from "../lib/fs.js";
import type { FileTreeNode, SessionState, ToolResult } from "../types.js";

function renderTree(nodes: FileTreeNode[], indent = ""): string {
  return nodes
    .map((n) => {
      const icon = n.type === "directory" ? "📁" : "📄";
      const line = `${indent}${icon} ${n.name}`;
      const children =
        n.children && n.children.length > 0
          ? "\n" + renderTree(n.children, indent + "  ")
          : "";
      return line + children;
    })
    .join("\n");
}

export async function handleCloneRepository(
  args: { url: string; branch?: string },
  state: SessionState
): Promise<ToolResult> {
  const { url, branch } = args;
  const localPath = getCachePath(url);

  if (nodeFs.existsSync(localPath)) {
    if (state.clonedRepos.has(url)) {
      // Already cloned and registered in this session
      return { content: [{ type: "text", text: `Repository already cloned at ${localPath}` }] };
    }
    // Dir exists from a prior session; register in state and return success
    state.clonedRepos.set(url, {
      url,
      localPath,
      branch: branch ?? "default",
      clonedAt: new Date(),
    });
    return { content: [{ type: "text", text: `Successfully cloned ${url} to ${localPath} (cached)` }] };
  }

  ensureCacheDir(localPath);

  try {
    await cloneRepo(url, localPath, branch);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: `Clone failed: ${msg}` }] };
  }

  state.clonedRepos.set(url, {
    url,
    localPath,
    branch: branch ?? "default",
    clonedAt: new Date(),
  });

  return {
    content: [
      {
        type: "text",
        text: `Successfully cloned ${url} to ${localPath}${branch ? ` (branch: ${branch})` : ""}`,
      },
    ],
  };
}

export async function handleGetRepoStructure(
  args: { url: string; depth?: number },
  state: SessionState
): Promise<ToolResult> {
  const repo = state.clonedRepos.get(args.url);
  if (!repo) {
    return {
      content: [{ type: "text", text: `Repo not cloned. Use clone_repository first.` }],
    };
  }

  const tree = getDirectoryTree(repo.localPath, args.depth ?? 4);
  return {
    content: [{ type: "text", text: `Structure of ${args.url}:\n\n${renderTree(tree)}` }],
  };
}

export async function handleReadFile(
  args: { url: string; path: string },
  state: SessionState
): Promise<ToolResult> {
  const repo = state.clonedRepos.get(args.url);
  if (!repo) {
    return {
      content: [{ type: "text", text: `Repo not cloned. Use clone_repository first.` }],
    };
  }

  const fullPath = nodePath.resolve(repo.localPath, args.path);
  if (!fullPath.startsWith(nodePath.resolve(repo.localPath) + nodePath.sep) &&
      fullPath !== nodePath.resolve(repo.localPath)) {
    return {
      content: [{ type: "text", text: `Security error: path resolves outside the repository root.` }],
    };
  }
  try {
    const { content, truncated, sizeBytes } = readFileTruncated(fullPath);
    const warning = truncated
      ? `\n\n⚠️ File truncated at 50KB (actual: ${Math.round(sizeBytes / 1024)}KB). Use search_in_repo to find specific sections.`
      : "";
    return { content: [{ type: "text", text: content + warning }] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `${msg}\n\nTip: use get_repo_structure to list available files.` }],
    };
  }
}

export async function handleSearchInRepo(
  args: { url: string; pattern: string },
  state: SessionState
): Promise<ToolResult> {
  const repo = state.clonedRepos.get(args.url);
  if (!repo) {
    return {
      content: [{ type: "text", text: `Repo not cloned. Use clone_repository first.` }],
    };
  }

  let regex: RegExp;
  try {
    regex = new RegExp(args.pattern, "i");
  } catch {
    return { content: [{ type: "text", text: `Invalid regex: ${args.pattern}` }] };
  }

  const results = searchInFiles(repo.localPath, regex);
  if (results.length === 0) {
    return { content: [{ type: "text", text: `No matches found for: ${args.pattern}` }] };
  }

  const MAX = 50;
  const shown = results.slice(0, MAX);
  const lines = shown.map((r) => `${r.file}:${r.line}  ${r.content}`);
  if (results.length > MAX) lines.push(`\n... and ${results.length - MAX} more matches`);

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

export async function handleListClonedRepos(state: SessionState): Promise<ToolResult> {
  if (state.clonedRepos.size === 0) {
    return { content: [{ type: "text", text: "No repositories cloned in this session." }] };
  }

  const lines = [...state.clonedRepos.values()].map(
    (r) => `• ${r.url}\n  Path: ${r.localPath}\n  Branch: ${r.branch}`
  );
  return { content: [{ type: "text", text: lines.join("\n\n") }] };
}

export function registerRepositoryTools(server: McpServer, state: SessionState): void {
  server.tool(
    "clone_repository",
    "Clone a Git repository to local cache for analysis",
    {
      url: z.string().describe("Git repository URL"),
      branch: z.string().optional().describe("Branch to clone (defaults to repo default branch)"),
    },
    (args) => handleCloneRepository(args, state)
  );

  server.tool(
    "get_repo_structure",
    "Get the directory tree of a cloned repository",
    {
      url: z.string().describe("Repository URL (must be cloned first)"),
      depth: z.number().int().min(1).max(8).default(4).optional().describe("Tree depth (default: 4)"),
    },
    (args) => handleGetRepoStructure(args, state)
  );

  server.tool(
    "read_file",
    "Read a file from a cloned repository. Files over 50KB are truncated.",
    {
      url: z.string().describe("Repository URL"),
      path: z.string().describe("File path relative to repository root"),
    },
    (args) => handleReadFile(args, state)
  );

  server.tool(
    "search_in_repo",
    "Search for a regex pattern across all files in a cloned repository",
    {
      url: z.string().describe("Repository URL"),
      pattern: z.string().describe("Regex pattern (e.g. 'JWT|auth|token')"),
    },
    (args) => handleSearchInRepo(args, state)
  );

  server.tool(
    "list_cloned_repos",
    "List all repositories cloned in the current session",
    {},
    () => handleListClonedRepos(state)
  );
}
