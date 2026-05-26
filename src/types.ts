export interface RefinementContext {
  transcript: string;
  squad?: string;
  system?: string;
  date: string;
  repos: string[];
}

export interface ClonedRepo {
  url: string;
  localPath: string;
  branch: string;
  clonedAt: Date;
}

export interface FileTreeNode {
  name: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

export interface SearchResult {
  file: string;
  line: number;
  content: string;
}

export interface ReadFileResult {
  content: string;
  truncated: boolean;
  sizeBytes: number;
}

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
}

export interface SessionState {
  context: RefinementContext | null;
  clonedRepos: Map<string, ClonedRepo>;
  savedArtifacts: string[];
}
