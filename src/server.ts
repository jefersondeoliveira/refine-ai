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

const server = new McpServer({ name: "refina-ai", version: "0.1.0" });

registerContextTools(server, state);
registerRepositoryTools(server, state);
registerArtifactTools(server, state);

const transport = new StdioServerTransport();
await server.connect(transport);
