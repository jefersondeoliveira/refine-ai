import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs");

import * as nodeFs from "node:fs";
import { getCachePath, ensureCacheDir } from "../../src/lib/cache.js";

describe("getCachePath", () => {
  it("returns a path under .refina-ai/cache", () => {
    const result = getCachePath("https://github.com/org/repo.git");
    expect(result).toContain(".refina-ai");
    expect(result).toContain("cache");
  });

  it("returns the same path for the same URL", () => {
    const url = "https://github.com/org/repo.git";
    expect(getCachePath(url)).toBe(getCachePath(url));
  });

  it("returns different paths for different URLs", () => {
    const a = getCachePath("https://github.com/org/repo1.git");
    const b = getCachePath("https://github.com/org/repo2.git");
    expect(a).not.toBe(b);
  });
});

describe("ensureCacheDir", () => {
  beforeEach(() => vi.resetAllMocks());

  it("creates directory when it does not exist", () => {
    vi.mocked(nodeFs.existsSync).mockReturnValue(false);
    ensureCacheDir("/some/path");
    expect(nodeFs.mkdirSync).toHaveBeenCalledWith("/some/path", { recursive: true });
  });

  it("skips mkdir when directory already exists", () => {
    vi.mocked(nodeFs.existsSync).mockReturnValue(true);
    ensureCacheDir("/some/path");
    expect(nodeFs.mkdirSync).not.toHaveBeenCalled();
  });
});
