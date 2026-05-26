import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SessionState, ToolResult } from "../types.js";

export async function handleSetRefinementContext(
  args: { transcript: string; squad?: string; system?: string; repos: string[] },
  state: SessionState
): Promise<ToolResult> {
  state.context = {
    transcript: args.transcript,
    squad: args.squad,
    system: args.system,
    date: new Date().toISOString().slice(0, 10),
    repos: args.repos,
  };

  const lines = ["Refinement context stored.", `Date: ${state.context.date}`];
  if (args.squad) lines.push(`Squad: ${args.squad}`);
  if (args.system) lines.push(`System: ${args.system}`);
  if (args.repos.length > 0) lines.push(`Repos: ${args.repos.join(", ")}`);

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

export function registerContextTools(server: McpServer, state: SessionState): void {
  server.tool(
    "set_refinement_context",
    "Store the meeting transcript and metadata for the current refinement session",
    {
      transcript: z.string().describe("Full meeting transcript"),
      squad: z.string().optional().describe("Squad name"),
      system: z.string().optional().describe("System or product being refined"),
      repos: z.array(z.string()).default([]).describe("Repository URLs involved"),
    },
    (args) => handleSetRefinementContext(args, state)
  );
}
