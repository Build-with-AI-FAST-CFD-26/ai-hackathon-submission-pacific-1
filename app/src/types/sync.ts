export type SourcePlatform =
  | "slack"
  | "gmail"
  | "notion"
  | "github"
  | "whatsapp"
  | "custom";

export type SourceStatus = "connected" | "disconnected" | "pending";

export interface SourceRecord {
  id: string;
  workspaceId: string;
  platform: SourcePlatform;
  name: string;
  description: string;
  status: SourceStatus;
  lastSyncAt: string | null;
  color: string;
  custom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SourceConnectionConfigRecord {
  id: string;
  sourceId: string;
  workspaceId: string;
  platform: SourcePlatform;
  values: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryItem {
  id: string;
  workspaceId: string;
  documentId?: string;
  platform: SourcePlatform;
  title: string;
  sourceLabel: string;
  author: string;
  createdAt: string;
  content: string;
  tags: string[];
  url?: string;
}

export type DecisionStatus = "resolved" | "pending";

export interface DecisionItem {
  id: string;
  workspaceId: string;
  title: string;
  rationale: string;
  decidedBy: string;
  decidedAt: string;
  status: DecisionStatus;
  context: string;
  tags: string[];
  sourceDocumentIds: string[];
}

export interface KnowledgeDocument {
  id: string;
  workspaceId: string;
  platform: SourcePlatform;
  title: string;
  sourceLabel: string;
  author: string;
  content: string;
  excerpt: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  url?: string;
}

export interface Citation {
  documentId: string;
  title: string;
  platform: SourcePlatform;
  snippet: string;
  date: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Citation[];
}

export interface SlackInstallation {
  id: string;
  workspaceId: string;
  teamId: string;
  teamName: string;
  accessToken: string;
  tokenType: string;
  scope: string;
  botUserId?: string;
  authedUserId?: string;
  appId?: string;
  enterpriseId?: string | null;
  enterpriseName?: string | null;
  installedAt: string;
  updatedAt: string;
  lastSyncAt: string | null;
}
