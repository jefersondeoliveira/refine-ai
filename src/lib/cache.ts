import * as crypto from "node:crypto";
import * as nodeFs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export function getCachePath(repoUrl: string): string {
  const hash = crypto.createHash("sha256").update(repoUrl).digest("hex").slice(0, 16);
  return path.join(os.homedir(), ".refina-ai", "cache", hash);
}

export function ensureCacheDir(dirPath: string): void {
  if (!nodeFs.existsSync(dirPath)) {
    nodeFs.mkdirSync(dirPath, { recursive: true });
  }
}
