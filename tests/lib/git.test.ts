import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("simple-git");

import { simpleGit } from "simple-git";
import { cloneRepo, isAuthError } from "../../src/lib/git.js";

const mockClone = vi.fn();
const mockEnv = vi.fn();

describe("cloneRepo", () => {
  beforeEach(() => {
    mockClone.mockReset();
    mockEnv.mockReset();
    mockEnv.mockReturnValue({ clone: mockClone });
    vi.mocked(simpleGit).mockReturnValue({ env: mockEnv } as any);
  });

  it("clones repo without branch flag when branch is omitted", async () => {
    mockClone.mockResolvedValue(undefined);
    await cloneRepo("https://github.com/org/repo.git", "/target");
    expect(mockClone).toHaveBeenCalledWith(
      "https://github.com/org/repo.git",
      "/target",
      expect.not.arrayContaining(["--branch"])
    );
  });

  it("passes --branch flag when branch is provided", async () => {
    mockClone.mockResolvedValue(undefined);
    await cloneRepo("https://github.com/org/repo.git", "/target", "develop");
    expect(mockClone).toHaveBeenCalledWith(
      "https://github.com/org/repo.git",
      "/target",
      expect.arrayContaining(["--branch", "develop"])
    );
  });

  it("injects username and password into HTTPS URL", async () => {
    mockClone.mockResolvedValue(undefined);
    await cloneRepo("https://gitlab.corp/repo.git", "/target", undefined, {
      username: "jeferson",
      password: "s3cr3t",
    });
    const calledUrl = mockClone.mock.calls[0][0] as string;
    expect(calledUrl).toContain("jeferson");
    expect(calledUrl).toContain("s3cr3t");
    expect(calledUrl).toContain("gitlab.corp");
  });

  it("sets HTTPS_PROXY and HTTP_PROXY env vars when http_proxy provided", async () => {
    mockClone.mockResolvedValue(undefined);
    const proxy = "http://user:pass@proxy.corp:8080";
    await cloneRepo("https://gitlab.corp/repo.git", "/target", undefined, {
      httpProxy: proxy,
    });
    const envArg = mockEnv.mock.calls[0][0] as Record<string, string>;
    expect(envArg["HTTPS_PROXY"]).toBe(proxy);
    expect(envArg["HTTP_PROXY"]).toBe(proxy);
  });

  it("throws a descriptive error when git clone fails", async () => {
    mockClone.mockRejectedValue(new Error("Repository not found"));
    await expect(
      cloneRepo("https://github.com/org/missing.git", "/target")
    ).rejects.toThrow("Failed to clone https://github.com/org/missing.git: Repository not found");
  });
});

describe("isAuthError", () => {
  it.each([
    "authentication failed",
    "could not read username for",
    "407 proxy authentication required",
    "Permission denied (publickey)",
    "Access denied",
  ])("detects auth error: %s", (msg) => {
    expect(isAuthError(msg)).toBe(true);
  });

  it("returns false for non-auth errors", () => {
    expect(isAuthError("Repository not found")).toBe(false);
  });
});
