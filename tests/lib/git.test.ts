import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("simple-git");

import { simpleGit } from "simple-git";
import { cloneRepo } from "../../src/lib/git.js";

const mockClone = vi.fn();

describe("cloneRepo", () => {
  beforeEach(() => {
    mockClone.mockReset();
    vi.mocked(simpleGit).mockReturnValue({ clone: mockClone } as any);
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

  it("throws a descriptive error when git clone fails", async () => {
    mockClone.mockRejectedValue(new Error("Repository not found"));
    await expect(
      cloneRepo("https://github.com/org/missing.git", "/target")
    ).rejects.toThrow("Failed to clone https://github.com/org/missing.git: Repository not found");
  });
});
