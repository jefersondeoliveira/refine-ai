import { describe, it, expect, vi, beforeEach } from "vitest";
import * as nodePath from "node:path";

vi.mock("node:fs");

import * as nodeFs from "node:fs";
import { readFileTruncated, getDirectoryTree, searchInFiles } from "../../src/lib/fs.js";

const ROOT = nodePath.resolve("/root");
const ROOT_SRC = nodePath.join(ROOT, "src");

const LIMIT = 50 * 1024;

describe("readFileTruncated", () => {
  it("returns full content for files under 50KB", () => {
    const content = "hello world";
    vi.mocked(nodeFs.statSync).mockReturnValue({ size: content.length } as any);
    vi.mocked(nodeFs.readFileSync).mockReturnValue(content);

    const result = readFileTruncated("/file.ts");

    expect(result.content).toBe(content);
    expect(result.truncated).toBe(false);
    expect(result.sizeBytes).toBe(content.length);
  });

  it("truncates content and flags it for files over 50KB", () => {
    const big = "x".repeat(LIMIT + 500);
    vi.mocked(nodeFs.statSync).mockReturnValue({ size: big.length } as any);
    vi.mocked(nodeFs.readFileSync).mockReturnValue(big);

    const result = readFileTruncated("/big.ts");

    expect(result.content.length).toBeLessThanOrEqual(LIMIT);
    expect(result.truncated).toBe(true);
    expect(result.sizeBytes).toBe(big.length);
  });

  it("throws 'File not found' when stat fails", () => {
    vi.mocked(nodeFs.statSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(() => readFileTruncated("/missing.ts")).toThrow("File not found: /missing.ts");
  });
});

describe("getDirectoryTree", () => {
  it("returns files and directories up to the specified depth", () => {
    vi.mocked(nodeFs.readdirSync).mockImplementation((dir: any) => {
      if (String(dir) === ROOT) return ["src", "package.json"] as any;
      if (String(dir) === ROOT_SRC) return ["index.ts"] as any;
      return [] as any;
    });
    vi.mocked(nodeFs.statSync).mockImplementation((p: any) => ({
      isDirectory: () => String(p) === ROOT_SRC,
    } as any));

    const tree = getDirectoryTree(ROOT, 2);

    expect(tree).toHaveLength(2);
    expect(tree[0]).toEqual({
      name: "src",
      type: "directory",
      children: [{ name: "index.ts", type: "file" }],
    });
    expect(tree[1]).toEqual({ name: "package.json", type: "file" });
  });

  it("stops recursing when maxDepth is reached", () => {
    vi.mocked(nodeFs.readdirSync).mockReturnValue(["deep"] as any);
    vi.mocked(nodeFs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    const tree = getDirectoryTree(ROOT, 1);

    expect(tree[0].children).toEqual([]);
  });
});

describe("searchInFiles", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns matching lines with file path and 1-based line number", () => {
    vi.mocked(nodeFs.readdirSync).mockReturnValue(["app.ts"] as any);
    vi.mocked(nodeFs.statSync).mockReturnValue({ isDirectory: () => false, size: 100 } as any);
    vi.mocked(nodeFs.readFileSync).mockReturnValue(
      "import express\nconst app = express()\napp.listen(3000)"
    );

    const results = searchInFiles(ROOT, /express/);

    expect(results).toHaveLength(2);
    expect(results[0].line).toBe(1);
    expect(results[1].line).toBe(2);
    expect(results[0].file).toContain("app.ts");
  });

  it("returns empty array when no matches found", () => {
    vi.mocked(nodeFs.readdirSync).mockReturnValue(["app.ts"] as any);
    vi.mocked(nodeFs.statSync).mockReturnValue({ isDirectory: () => false, size: 20 } as any);
    vi.mocked(nodeFs.readFileSync).mockReturnValue("no matches here");

    expect(searchInFiles(ROOT, /kafka/)).toHaveLength(0);
  });
});
