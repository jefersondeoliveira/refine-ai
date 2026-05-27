import { describe, it, expect, vi, beforeEach } from "vitest";
import * as os from "node:os";

vi.mock("../../src/lib/git.js");
vi.mock("../../src/lib/cache.js");
vi.mock("../../src/lib/fs.js");
vi.mock("node:fs");

import { cloneRepo } from "../../src/lib/git.js";
import { getCachePath, ensureCacheDir } from "../../src/lib/cache.js";
import { getDirectoryTree, readFileTruncated, searchInFiles } from "../../src/lib/fs.js";
import * as nodeFs from "node:fs";
import type { SessionState } from "../../src/types.js";
import {
  handleCloneRepository,
  handleGetRepoStructure,
  handleReadFile,
  handleSearchInRepo,
  handleListClonedRepos,
} from "../../src/tools/repository.js";

const REPO_URL = "https://github.com/org/repo.git";
const CACHE_PATH = "/cache/abc123";

function makeState(repos: Record<string, any> = {}): SessionState {
  return { context: null, clonedRepos: new Map(Object.entries(repos)), savedArtifacts: [] };
}

describe("handleCloneRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachePath).mockReturnValue(CACHE_PATH);
    vi.mocked(ensureCacheDir).mockReturnValue(undefined);
    vi.mocked(nodeFs.existsSync).mockReturnValue(false);
  });

  it("clones repo and records it in session state", async () => {
    vi.mocked(cloneRepo).mockResolvedValue(undefined);
    const state = makeState();

    const result = await handleCloneRepository({ url: REPO_URL }, state);

    expect(cloneRepo).toHaveBeenCalledWith(REPO_URL, CACHE_PATH, undefined, expect.any(Object));
    expect(state.clonedRepos.has(REPO_URL)).toBe(true);
    expect(result.content[0].text).toContain("Successfully cloned");
  });

  it("skips clone and reports cache hit when repo already present", async () => {
    vi.mocked(nodeFs.existsSync).mockReturnValue(true);
    const state = makeState({
      [REPO_URL]: { url: REPO_URL, localPath: CACHE_PATH, branch: "main", clonedAt: new Date() },
    });

    const result = await handleCloneRepository({ url: REPO_URL }, state);

    expect(cloneRepo).not.toHaveBeenCalled();
    expect(result.content[0].text).toContain("already cloned");
  });

  it("returns error text without throwing when clone fails", async () => {
    vi.mocked(cloneRepo).mockRejectedValue(new Error("Auth failed"));
    const state = makeState();

    const result = await handleCloneRepository({ url: REPO_URL }, state);

    expect(result.content[0].text).toContain("Auth failed");
    expect(state.clonedRepos.size).toBe(0);
  });

  it("registers a Unix absolute path without cloning", async () => {
    const localPath = "/workspace/my-project";
    vi.mocked(nodeFs.existsSync).mockReturnValue(true);
    const state = makeState();

    const result = await handleCloneRepository({ url: localPath }, state);

    expect(cloneRepo).not.toHaveBeenCalled();
    expect(state.clonedRepos.has(localPath)).toBe(true);
    expect(state.clonedRepos.get(localPath)?.branch).toBe("local");
    expect(result.content[0].text).toContain("local repository");
  });

  it("registers a Windows absolute path (C:\\) without cloning", async () => {
    const localPath = "C:\\workspace\\my-project";
    vi.mocked(nodeFs.existsSync).mockReturnValue(true);
    const state = makeState();

    const result = await handleCloneRepository({ url: localPath }, state);

    expect(cloneRepo).not.toHaveBeenCalled();
    expect(state.clonedRepos.has(localPath)).toBe(true);
    expect(result.content[0].text).toContain("local repository");
  });

  it("registers a tilde path (~/) without cloning and expands to homedir", async () => {
    const tildePath = "~/projects/my-project";
    vi.mocked(nodeFs.existsSync).mockReturnValue(true);
    const state = makeState();

    const result = await handleCloneRepository({ url: tildePath }, state);

    expect(cloneRepo).not.toHaveBeenCalled();
    expect(state.clonedRepos.has(tildePath)).toBe(true);
    // stored localPath should be expanded
    expect(state.clonedRepos.get(tildePath)?.localPath).toContain(os.homedir());
    expect(result.content[0].text).toContain("local repository");
  });

  it("returns error for local path that does not exist", async () => {
    vi.mocked(nodeFs.existsSync).mockReturnValue(false);
    const state = makeState();

    const result = await handleCloneRepository({ url: "/workspace/missing-project" }, state);

    expect(cloneRepo).not.toHaveBeenCalled();
    expect(state.clonedRepos.size).toBe(0);
    expect(result.content[0].text).toContain("not found");
  });
});

describe("handleGetRepoStructure", () => {
  it("returns formatted tree for a cloned repo", async () => {
    const state = makeState({
      [REPO_URL]: { url: REPO_URL, localPath: CACHE_PATH, branch: "main", clonedAt: new Date() },
    });
    vi.mocked(getDirectoryTree).mockReturnValue([
      { name: "src", type: "directory", children: [{ name: "index.ts", type: "file" }] },
      { name: "package.json", type: "file" },
    ]);

    const result = await handleGetRepoStructure({ url: REPO_URL }, state);

    expect(result.content[0].text).toContain("src");
    expect(result.content[0].text).toContain("index.ts");
    expect(result.content[0].text).toContain("package.json");
  });

  it("returns guidance to clone when repo not in session", async () => {
    const state = makeState();
    const result = await handleGetRepoStructure({ url: REPO_URL }, state);
    expect(result.content[0].text).toContain("clone_repository");
  });
});

describe("handleReadFile", () => {
  it("returns file content for a cloned repo", async () => {
    const state = makeState({
      [REPO_URL]: { url: REPO_URL, localPath: CACHE_PATH, branch: "main", clonedAt: new Date() },
    });
    vi.mocked(readFileTruncated).mockReturnValue({
      content: "export const x = 1;",
      truncated: false,
      sizeBytes: 20,
    });

    const result = await handleReadFile({ url: REPO_URL, path: "src/index.ts" }, state);

    expect(result.content[0].text).toContain("export const x = 1;");
    expect(result.content[0].text).not.toContain("truncated");
  });

  it("appends truncation warning when file was truncated", async () => {
    const state = makeState({
      [REPO_URL]: { url: REPO_URL, localPath: CACHE_PATH, branch: "main", clonedAt: new Date() },
    });
    vi.mocked(readFileTruncated).mockReturnValue({
      content: "partial content",
      truncated: true,
      sizeBytes: 60 * 1024,
    });

    const result = await handleReadFile({ url: REPO_URL, path: "big.ts" }, state);

    expect(result.content[0].text).toContain("truncated");
  });

  it("rejects path traversal attempts", async () => {
    const state = makeState({
      [REPO_URL]: { url: REPO_URL, localPath: CACHE_PATH, branch: "main", clonedAt: new Date() },
    });

    const result = await handleReadFile({ url: REPO_URL, path: "../../.ssh/id_rsa" }, state);

    expect(result.content[0].text).toContain("Security error");
  });
});

describe("handleSearchInRepo", () => {
  it("returns formatted search results", async () => {
    const state = makeState({
      [REPO_URL]: { url: REPO_URL, localPath: CACHE_PATH, branch: "main", clonedAt: new Date() },
    });
    vi.mocked(searchInFiles).mockReturnValue([
      { file: "/cache/abc123/src/auth.ts", line: 12, content: "verifyJWT(token)" },
    ]);

    const result = await handleSearchInRepo({ url: REPO_URL, pattern: "JWT" }, state);

    expect(result.content[0].text).toContain("auth.ts:12");
    expect(result.content[0].text).toContain("verifyJWT");
  });

  it("returns no-matches message for unmatched pattern", async () => {
    const state = makeState({
      [REPO_URL]: { url: REPO_URL, localPath: CACHE_PATH, branch: "main", clonedAt: new Date() },
    });
    vi.mocked(searchInFiles).mockReturnValue([]);

    const result = await handleSearchInRepo({ url: REPO_URL, pattern: "kafka" }, state);

    expect(result.content[0].text).toContain("No matches");
  });
});

describe("handleListClonedRepos", () => {
  it("reports no repos when session is empty", async () => {
    const result = await handleListClonedRepos(makeState());
    expect(result.content[0].text).toContain("No repositories");
  });

  it("lists all repos in the session", async () => {
    const state = makeState({
      "https://github.com/org/repo1.git": {
        url: "https://github.com/org/repo1.git",
        localPath: "/cache/a",
        branch: "main",
        clonedAt: new Date(),
      },
      "https://github.com/org/repo2.git": {
        url: "https://github.com/org/repo2.git",
        localPath: "/cache/b",
        branch: "develop",
        clonedAt: new Date(),
      },
    });

    const result = await handleListClonedRepos(state);

    expect(result.content[0].text).toContain("repo1.git");
    expect(result.content[0].text).toContain("repo2.git");
  });
});
