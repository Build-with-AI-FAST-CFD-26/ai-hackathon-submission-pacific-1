import type { SourceRecord } from "@/types/sync";

const catalogTimestamp = "2026-04-28T00:00:00.000Z";

const baseSources = [
  {
    id: "slack",
    platform: "slack",
    name: "Slack",
    description: "Authorize Slack and ingest channels, threads, members, and commitments.",
    color: "#4A154B",
  },
  {
    id: "gmail",
    platform: "gmail",
    name: "Gmail",
    description: "Index founder, customer, and investor email threads into Sync memory.",
    color: "#EA4335",
  },
  {
    id: "notion",
    platform: "notion",
    name: "Notion",
    description: "Search docs, specs, retros, wikis, and roadmaps from your workspace.",
    color: "#FFFFFF",
  },
  {
    id: "github",
    platform: "github",
    name: "GitHub",
    description: "Pull issues, pull requests, releases, and engineering context into Sync.",
    color: "#333333",
  },
  {
    id: "whatsapp",
    platform: "whatsapp",
    name: "WhatsApp",
    description: "Prepare external chat ingestion for partner and field conversations.",
    color: "#25D366",
  },
] as const;

export function buildSourceCatalog(workspaceId: string): SourceRecord[] {
  return baseSources.map((source) => ({
    ...source,
    workspaceId,
    status: "disconnected",
    lastSyncAt: null,
    custom: false,
    createdAt: catalogTimestamp,
    updatedAt: catalogTimestamp,
  }));
}
