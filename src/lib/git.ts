import { simpleGit } from "simple-git";

export async function cloneRepo(
  url: string,
  targetPath: string,
  branch?: string
): Promise<void> {
  const git = simpleGit();
  const options: string[] = ["--depth", "1"];
  if (branch) options.push("--branch", branch);

  try {
    await git.clone(url, targetPath, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to clone ${url}: ${message}`);
  }
}
