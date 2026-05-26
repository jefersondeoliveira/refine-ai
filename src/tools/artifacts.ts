import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SessionState, ToolResult } from "../types.js";

export async function handleSaveArtifact(
  args: { path: string; content: string },
  state: SessionState,
  workspace: string
): Promise<ToolResult> {
  const fullPath = nodePath.resolve(workspace, args.path);

  if (!fullPath.startsWith(nodePath.resolve(workspace) + nodePath.sep) &&
      fullPath !== nodePath.resolve(workspace)) {
    return {
      content: [
        {
          type: "text",
          text: `Security error: path resolves outside the workspace. Use a relative path.`,
        },
      ],
    };
  }

  nodeFs.mkdirSync(nodePath.dirname(fullPath), { recursive: true });
  nodeFs.writeFileSync(fullPath, args.content, "utf-8");
  state.savedArtifacts.push(fullPath);

  return { content: [{ type: "text", text: `Saved artifact to ${fullPath}` }] };
}

export async function handleListArtifacts(state: SessionState): Promise<ToolResult> {
  if (state.savedArtifacts.length === 0) {
    return { content: [{ type: "text", text: "No artifacts saved in this session." }] };
  }
  const lines = state.savedArtifacts.map((p) => `• ${p}`);
  return { content: [{ type: "text", text: lines.join("\n") }] };
}

export function registerArtifactTools(server: McpServer, state: SessionState): void {
  const workspace = process.cwd();

  server.tool(
    "save_artifact",
    "Save generated markdown content as a file in the current workspace",
    {
      path: z.string().describe("Relative file path within the workspace (e.g. 'specs/2026-05-26-feature.md')"),
      content: z.string().describe("Full markdown content to save"),
    },
    (args) => handleSaveArtifact(args, state, workspace)
  );

  server.tool(
    "list_artifacts",
    "List all markdown artifacts saved in the current session",
    {},
    () => handleListArtifacts(state)
  );
}
