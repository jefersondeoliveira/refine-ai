import { describe, it, expect, afterAll } from "vitest";
import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import * as os from "node:os";
import { handleCloneRepository, handleGetRepoStructure, handleReadFile, handleSearchInRepo, handleListClonedRepos } from "../../src/tools/repository.js";
import { handleSaveArtifact, handleListArtifacts } from "../../src/tools/artifacts.js";
import { handleSetRefinementContext } from "../../src/tools/context.js";
import type { SessionState } from "../../src/types.js";

// Small, stable public repo maintained by GitHub as a canonical test fixture
const TEST_REPO = "https://github.com/octocat/Hello-World.git";
const WORKSPACE = nodePath.join(os.tmpdir(), "refina-ai-integration");

function makeState(): SessionState {
  return { context: null, clonedRepos: new Map(), savedArtifacts: [] };
}

afterAll(() => {
  nodeFs.rmSync(WORKSPACE, { recursive: true, force: true });
});

describe("full refinement session", () => {
  const state = makeState();

  it("stores refinement context", async () => {
    const result = await handleSetRefinementContext(
      { transcript: "Add README improvements", squad: "Docs", repos: [TEST_REPO] },
      state
    );
    expect(result.content[0].text).toContain("Refinement context stored");
    expect(state.context?.squad).toBe("Docs");
  });

  it("clones a real public repo", async () => {
    const result = await handleCloneRepository({ url: TEST_REPO }, state);
    expect(result.content[0].text).toContain("Successfully cloned");
    expect(state.clonedRepos.has(TEST_REPO)).toBe(true);
  }, 60_000);

  it("returns directory structure after clone", async () => {
    const result = await handleGetRepoStructure({ url: TEST_REPO }, state);
    expect(result.content[0].text).toContain("Structure of");
    expect(result.content[0].text).not.toContain("not cloned");
  });

  it("reads README.md from the cloned repo", async () => {
    const result = await handleReadFile({ url: TEST_REPO, path: "README" }, state);
    expect(result.content[0].text.length).toBeGreaterThan(0);
  });

  it("searches files by pattern", async () => {
    const result = await handleSearchInRepo({ url: TEST_REPO, pattern: "Hello" }, state);
    // either finds matches or reports no-matches — both are valid, just not an error
    expect(result.content[0].text.length).toBeGreaterThan(0);
  });

  it("lists cloned repos", async () => {
    const result = await handleListClonedRepos(state);
    expect(result.content[0].text).toContain("Hello-World");
  });

  it("saves an artifact to a temp workspace", async () => {
    nodeFs.mkdirSync(WORKSPACE, { recursive: true });
    const result = await handleSaveArtifact(
      { path: "spec.md", content: "# Integration Test Spec" },
      state,
      WORKSPACE
    );
    expect(result.content[0].text).toContain("Saved artifact");
    expect(nodeFs.existsSync(nodePath.join(WORKSPACE, "spec.md"))).toBe(true);
  });

  it("lists saved artifacts", async () => {
    const result = await handleListArtifacts(state);
    expect(result.content[0].text).toContain("spec.md");
  });
});
