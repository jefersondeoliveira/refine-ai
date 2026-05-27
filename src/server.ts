#!/usr/bin/env node
import { rmSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { SessionState } from "./types.js";
import { registerContextTools } from "./tools/context.js";
import { registerRepositoryTools } from "./tools/repository.js";
import { registerArtifactTools } from "./tools/artifacts.js";

const state: SessionState = {
  context: null,
  clonedRepos: new Map(),
  savedArtifacts: [],
};

// Delete cloned repos on exit — local paths (branch === "local") are never deleted.
function cleanupClonedRepos() {
  for (const repo of state.clonedRepos.values()) {
    if (repo.branch !== "local") {
      try {
        rmSync(repo.localPath, { recursive: true, force: true });
      } catch {
        // best-effort: ignore errors during shutdown
      }
    }
  }
}

process.on("exit", cleanupClonedRepos);
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

const server = new McpServer({ name: "refina-ai", version: "0.1.0" });

registerContextTools(server, state);
registerRepositoryTools(server, state);
registerArtifactTools(server, state);

const transport = new StdioServerTransport();
await server.connect(transport);
