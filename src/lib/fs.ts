import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import type { FileTreeNode, ReadFileResult, SearchResult } from "../types.js";

const FILE_SIZE_LIMIT = 50 * 1024;

const IGNORED = new Set([
  "node_modules", ".git", "dist", "build", ".next", "coverage", "__pycache__",
]);

export function readFileTruncated(filePath: string): ReadFileResult {
  let stat: nodeFs.Stats;
  try {
    stat = nodeFs.statSync(filePath);
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }

  const sizeBytes = stat.size;
  const raw = nodeFs.readFileSync(filePath, "utf-8");
  const content = sizeBytes > FILE_SIZE_LIMIT ? raw.slice(0, FILE_SIZE_LIMIT) : raw;

  return { content, truncated: sizeBytes > FILE_SIZE_LIMIT, sizeBytes };
}

export function getDirectoryTree(
  dirPath: string,
  maxDepth: number,
  depth = 0
): FileTreeNode[] {
  if (depth >= maxDepth) return [];

  return (nodeFs.readdirSync(dirPath) as string[])
    .filter((e) => !IGNORED.has(e))
    .map((entry) => {
      const full = nodePath.join(dirPath, entry);
      const stat = nodeFs.statSync(full);
      if (stat.isDirectory()) {
        return {
          name: entry,
          type: "directory" as const,
          children: getDirectoryTree(full, maxDepth, depth + 1),
        };
      }
      return { name: entry, type: "file" as const };
    });
}

export function searchInFiles(
  dirPath: string,
  pattern: RegExp,
  depth = 0,
  maxDepth = 10
): SearchResult[] {
  if (depth > maxDepth) return [];

  const results: SearchResult[] = [];

  for (const entry of nodeFs.readdirSync(dirPath) as string[]) {
    if (IGNORED.has(entry)) continue;
    const full = nodePath.join(dirPath, entry);
    const stat = nodeFs.statSync(full);

    if (stat.isDirectory()) {
      results.push(...searchInFiles(full, pattern, depth + 1, maxDepth));
    } else if (stat.size < FILE_SIZE_LIMIT) {
      const lines = (nodeFs.readFileSync(full, "utf-8") as string).split("\n");
      lines.forEach((line, i) => {
        if (pattern.test(line)) {
          results.push({ file: full, line: i + 1, content: line.trim() });
        }
      });
    }
  }

  return results;
}
