import { simpleGit } from "simple-git";

export interface CloneCredentials {
  username?: string;
  password?: string;
  httpProxy?: string; // full URL e.g. http://user:pass@proxy.corp:8080
}

function injectCredentials(url: string, username: string, password: string): string {
  try {
    const u = new URL(url);
    u.username = encodeURIComponent(username);
    u.password = encodeURIComponent(password);
    return u.toString();
  } catch {
    return url; // not a parseable URL — return unchanged
  }
}

export function isAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("authentication failed") ||
    lower.includes("could not read username") ||
    lower.includes("could not read password") ||
    lower.includes("invalid username or password") ||
    lower.includes("403") ||
    lower.includes("401") ||
    lower.includes("407") ||
    lower.includes("proxy") ||
    lower.includes("credential") ||
    lower.includes("permission denied") ||
    lower.includes("access denied")
  );
}

export async function cloneRepo(
  url: string,
  targetPath: string,
  branch?: string,
  credentials?: CloneCredentials
): Promise<void> {
  const git = simpleGit();
  const options: string[] = ["--depth", "1"];
  if (branch) options.push("--branch", branch);

  const env: NodeJS.ProcessEnv = { ...process.env };
  if (credentials?.httpProxy) {
    env["HTTPS_PROXY"] = credentials.httpProxy;
    env["HTTP_PROXY"] = credentials.httpProxy;
  }

  const cloneUrl =
    credentials?.username && credentials?.password
      ? injectCredentials(url, credentials.username, credentials.password)
      : url;

  try {
    await simpleGit({ config: [] }).env(env).clone(cloneUrl, targetPath, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to clone ${url}: ${message}`);
  }
}
