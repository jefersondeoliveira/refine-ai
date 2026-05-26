import { describe, it, expect } from "vitest";
import type { SessionState } from "../../src/types.js";
import { handleSetRefinementContext } from "../../src/tools/context.js";

function makeState(): SessionState {
  return { context: null, clonedRepos: new Map(), savedArtifacts: [] };
}

describe("handleSetRefinementContext", () => {
  it("stores context in session state", async () => {
    const state = makeState();
    await handleSetRefinementContext(
      {
        transcript: "We need JWT auth",
        squad: "Platform",
        system: "API Gateway",
        repos: ["https://github.com/org/gateway"],
      },
      state
    );

    expect(state.context).not.toBeNull();
    expect(state.context?.transcript).toBe("We need JWT auth");
    expect(state.context?.squad).toBe("Platform");
    expect(state.context?.repos).toHaveLength(1);
    expect(state.context?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns confirmation text with stored metadata", async () => {
    const state = makeState();
    const result = await handleSetRefinementContext(
      { transcript: "Transcript text", repos: [], squad: "Core" },
      state
    );

    expect(result.content[0].text).toContain("Refinement context stored");
    expect(result.content[0].text).toContain("Core");
  });

  it("overwrites previous context when called again", async () => {
    const state = makeState();
    await handleSetRefinementContext({ transcript: "first", repos: [] }, state);
    await handleSetRefinementContext({ transcript: "second", repos: [] }, state);

    expect(state.context?.transcript).toBe("second");
  });
});
