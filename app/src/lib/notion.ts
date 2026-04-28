import {
  deleteSourceConnectionConfig,
  getSourceConnectionConfig,
  saveSourceConnectionConfig,
  updateSourceStatus,
  upsertKnowledgeDocument,
  upsertMemoryItem,
} from "@/lib/sync-repository";
import { serverEnv } from "@/lib/env";
import type { KnowledgeDocument, MemoryItem } from "@/types/sync";

const NOTION_VERSION = "2022-06-28";

type NotionObjectType = "page" | "database";

interface NotionParent {
  type?: string;
}

interface NotionRichText {
  plain_text?: string;
}

interface NotionPropertyValue {
  id?: string;
  type?: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  plain_text?: string;
}

interface NotionEntity {
  object: NotionObjectType;
  id: string;
  url?: string;
  created_time: string;
  last_edited_time: string;
  parent?: NotionParent;
  properties?: Record<string, NotionPropertyValue>;
  title?: NotionRichText[];
}

interface NotionSearchResponse {
  results: NotionEntity[];
}

interface NotionBlockChildResponse {
  results: Array<{
    type?: string;
    [key: string]: unknown;
  }>;
}

function getWorkspaceId(workspaceId?: string) {
  return workspaceId ?? serverEnv.SYNC_DEFAULT_WORKSPACE_ID;
}

async function getNotionConfig(workspaceId?: string) {
  const config = await getSourceConnectionConfig("notion", workspaceId);
  return config?.values ?? {};
}

async function notionApiRequest<T>(
  token: string,
  path: string,
  init?: RequestInit,
) {
  const response = await fetch(`https://api.notion.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Notion API failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as T;
}

function richTextToPlainText(richText?: NotionRichText[]) {
  return (richText ?? []).map((item) => item.plain_text ?? "").join(" ").trim();
}

function getNotionTitle(entity: NotionEntity) {
  if (entity.object === "database") {
    return richTextToPlainText(entity.title) || "Untitled database";
  }

  const titleProperty = Object.values(entity.properties ?? {}).find(
    (property) => property.type === "title",
  );
  return richTextToPlainText(titleProperty?.title) || "Untitled page";
}

function normalizeId(rawId: string) {
  return rawId.replace(/-/g, "");
}

async function fetchNotionEntity(token: string, rawId: string) {
  const candidates: Array<{ object: NotionObjectType; path: string }> = [
    { object: "page", path: `pages/${normalizeId(rawId)}` },
    { object: "database", path: `databases/${normalizeId(rawId)}` },
  ];

  for (const candidate of candidates) {
    try {
      return await notionApiRequest<NotionEntity>(token, candidate.path);
    } catch {
      // Try the next object type.
    }
  }

  return null;
}

async function fetchNotionBlockSummary(token: string, blockId: string) {
  try {
    const payload = await notionApiRequest<NotionBlockChildResponse>(
      token,
      `blocks/${normalizeId(blockId)}/children?page_size=20`,
    );

    const parts = payload.results
      .map((block) => {
        const blockValue = block[block.type ?? ""] as
          | { rich_text?: NotionRichText[]; text?: NotionRichText[] }
          | undefined;
        return richTextToPlainText(blockValue?.rich_text ?? blockValue?.text);
      })
      .filter(Boolean);

    return parts.join(" ").trim();
  } catch {
    return "";
  }
}

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function formatNotionEntity(params: {
  workspaceId: string;
  entity: NotionEntity;
  summary: string;
}): { document: KnowledgeDocument; memoryItem: MemoryItem } {
  const title = getNotionTitle(params.entity);
  const excerpt = truncate(params.summary || title, 220);
  const sourceLabel = params.entity.object === "database" ? "Notion / Database" : "Notion / Page";
  const kindLabel = params.entity.object === "database" ? "Database" : "Page";
  const content = [
    `${kindLabel}: ${title}.`,
    params.summary ? `Summary: ${params.summary}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const documentId = `notion-${params.entity.id}`;

  return {
    document: {
      id: documentId,
      workspaceId: params.workspaceId,
      platform: "notion",
      title: `Notion ${kindLabel.toLowerCase()}: ${truncate(title, 90)}`,
      sourceLabel,
      author: "Notion workspace",
      content,
      excerpt,
      tags: ["Notion", kindLabel],
      createdAt: params.entity.created_time,
      updatedAt: params.entity.last_edited_time,
      url: params.entity.url,
    },
    memoryItem: {
      id: `memory-${documentId}`,
      workspaceId: params.workspaceId,
      documentId,
      platform: "notion",
      title,
      sourceLabel,
      author: "Notion workspace",
      createdAt: params.entity.last_edited_time,
      content: excerpt,
      tags: ["Notion", kindLabel],
      url: params.entity.url,
    },
  };
}

async function listNotionEntities(token: string, workspaceId?: string) {
  const config = await getNotionConfig(workspaceId);
  if (config.workspaceRoot) {
    const rootEntity = await fetchNotionEntity(token, config.workspaceRoot);
    return rootEntity ? [rootEntity] : [];
  }

  const payload = await notionApiRequest<NotionSearchResponse>(token, "search", {
    method: "POST",
    body: JSON.stringify({
      page_size: 12,
      sort: {
        direction: "descending",
        timestamp: "last_edited_time",
      },
    }),
  });

  return payload.results;
}

export async function syncNotionWorkspace(workspaceId?: string) {
  const workspaceIdValue = getWorkspaceId(workspaceId);
  const config = await getNotionConfig(workspaceIdValue);
  if (!config.integrationSecret) {
    throw new Error("Notion integration secret is missing.");
  }

  const entities = await listNotionEntities(config.integrationSecret, workspaceIdValue);
  let syncedItems = 0;

  for (const entity of entities) {
    const summary = entity.object === "page"
      ? await fetchNotionBlockSummary(config.integrationSecret, entity.id)
      : "";
    const formatted = formatNotionEntity({
      workspaceId: workspaceIdValue,
      entity,
      summary,
    });
    await upsertKnowledgeDocument(formatted.document);
    await upsertMemoryItem(formatted.memoryItem);
    syncedItems += 1;
  }

  await saveSourceConnectionConfig({
    sourceId: "notion",
    platform: "notion",
    workspaceId: workspaceIdValue,
    status: "connected",
    values: config,
  });
  await updateSourceStatus({
    sourceId: "notion",
    status: "connected",
    workspaceId: workspaceIdValue,
  });

  return {
    syncedItems,
  };
}

export async function disconnectNotion(workspaceId?: string) {
  const workspaceIdValue = getWorkspaceId(workspaceId);
  await deleteSourceConnectionConfig("notion", workspaceIdValue);
  await updateSourceStatus({
    sourceId: "notion",
    status: "disconnected",
    workspaceId: workspaceIdValue,
  });
}
