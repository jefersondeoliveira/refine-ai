import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs");

import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import type { SessionState } from "../../src/types.js";
import { handleSaveArtifact, handleListArtifacts } from "../../src/tools/artifacts.js";

const WORKSPACE = "/workspace";

function makeState(artifacts: string[] = []): SessionState {
  return { context: null, clonedRepos: new Map(), savedArtifacts: [...artifacts] };
}

describe("handleSaveArtifact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(nodeFs.mkdirSync).mockReturnValue(undefined as any);
    vi.mocked(nodeFs.writeFileSync).mockReturnValue(undefined);
  });

  it("writes file to workspace and records it in state", async () => {
    const state = makeState();

    const result = await handleSaveArtifact(
      { path: "specs/jwt.md", content: "# JWT Spec" },
      state,
      WORKSPACE
    );

    const expected = nodePath.resolve(WORKSPACE, "specs/jwt.md");
    expect(nodeFs.writeFileSync).toHaveBeenCalledWith(expected, "# JWT Spec", "utf-8");
    expect(state.savedArtifacts).toContain(expected);
    expect(result.content[0].text).toContain("Saved artifact");
  });

  it("rejects path traversal attempts", async () => {
    const state = makeState();

    const result = await handleSaveArtifact(
      { path: "../../etc/passwd", content: "bad" },
      state,
      WORKSPACE
    );

    expect(nodeFs.writeFileSync).not.toHaveBeenCalled();
    expect(result.content[0].text).toContain("outside the workspace");
  });
});

describe("handleListArtifacts", () => {
  it("reports empty state", async () => {
    const result = await handleListArtifacts(makeState());
    expect(result.content[0].text).toContain("No artifacts");
  });

  it("lists previously saved artifacts", async () => {
    const state = makeState(["/workspace/specs/a.md", "/workspace/specs/b.md"]);
    const result = await handleListArtifacts(state);
    expect(result.content[0].text).toContain("a.md");
    expect(result.content[0].text).toContain("b.md");
  });
});
