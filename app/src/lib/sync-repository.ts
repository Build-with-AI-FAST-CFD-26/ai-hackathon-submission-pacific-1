import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongodb";
import { serverEnv } from "@/lib/env";
import { buildSourceCatalog } from "@/lib/source-catalog";
import type {
  DecisionItem,
  KnowledgeDocument,
  MemoryItem,
  SourceConnectionConfigRecord,
  SlackInstallation,
  SourceRecord,
  SourcePlatform,
  SourceStatus,
} from "@/types/sync";

const COLLECTIONS = {
  sources: "sources",
  memory: "memory_items",
  decisions: "decisions",
  knowledge: "knowledge_documents",
  slackInstallations: "slack_installations",
  sourceConfigs: "source_connection_configs",
} as const;

const sourceCatalogInitializedWorkspaces = new Set<string>();

interface RuntimeWorkspaceState {
  sourceOverrides: Map<string, Partial<SourceRecord>>;
  customSources: Map<string, SourceRecord>;
  sourceConfigs: Map<string, SourceConnectionConfigRecord>;
  slackInstallations: Map<string, SlackInstallation>;
  knowledgeDocuments: Map<string, KnowledgeDocument>;
  memoryItems: Map<string, MemoryItem>;
  decisions: Map<string, DecisionItem>;
}

const runtimeWorkspaceState = new Map<string, RuntimeWorkspaceState>();

function sortByDateDesc<T extends { createdAt?: string; decidedAt?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const left = a.createdAt ?? a.decidedAt ?? "";
    const right = b.createdAt ?? b.decidedAt ?? "";
    return right.localeCompare(left);
  });
}

function matchesQuery(haystack: string[], query?: string) {
  if (!query) {
    return true;
  }

  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return haystack.some((value) => value.toLowerCase().includes(normalized));
}

async function ensureSourceCatalog(workspaceId: string) {
  const db = await getDb();
  if (!db || sourceCatalogInitializedWorkspaces.has(workspaceId)) {
    return;
  }

  const catalog = buildSourceCatalog(workspaceId);

  await db.collection<SourceRecord>(COLLECTIONS.sources).bulkWrite(
    catalog.map((source) => ({
      updateOne: {
        filter: { id: source.id, workspaceId },
        update: { $setOnInsert: source },
        upsert: true,
      },
    })),
  );

  sourceCatalogInitializedWorkspaces.add(workspaceId);
}

function getRuntimeWorkspaceState(workspaceId: string): RuntimeWorkspaceState {
  const existingState = runtimeWorkspaceState.get(workspaceId);
  if (existingState) {
    return existingState;
  }

  const initialState: RuntimeWorkspaceState = {
    sourceOverrides: new Map(),
    customSources: new Map(),
    sourceConfigs: new Map(),
    slackInstallations: new Map(),
    knowledgeDocuments: new Map(),
    memoryItems: new Map(),
    decisions: new Map(),
  };

  runtimeWorkspaceState.set(workspaceId, initialState);
  return initialState;
}

function getRuntimeSources(workspaceId: string) {
  const runtimeState = getRuntimeWorkspaceState(workspaceId);
  const catalogSources = buildSourceCatalog(workspaceId).map((source) => {
    const override = runtimeState.sourceOverrides.get(source.id);
    if (!override) {
      return source;
    }

    return {
      ...source,
      ...override,
    };
  });

  return [...catalogSources, ...Array.from(runtimeState.customSources.values())];
}

function getWorkspaceId(workspaceId?: string) {
  return workspaceId ?? serverEnv.SYNC_DEFAULT_WORKSPACE_ID;
}

export async function getSources(workspaceId?: string) {
  const resolvedWorkspaceId = getWorkspaceId(workspaceId);
  const db = await getDb();

  if (!db) {
    const runtimeState = getRuntimeWorkspaceState(resolvedWorkspaceId);
    const sources = getRuntimeSources(resolvedWorkspaceId);
    const slackInstall = Array.from(runtimeState.slackInstallations.values())[0];

    return sources.map((source) => {
      if (source.platform !== "slack" || !slackInstall) {
        return source;
      }

      return {
        ...source,
        status: "connected" as const,
        lastSyncAt: slackInstall.lastSyncAt ?? source.lastSyncAt,
        updatedAt: slackInstall.updatedAt,
      };
    });
  }

  await ensureSourceCatalog(resolvedWorkspaceId);

  const sources = await db
    .collection<SourceRecord>(COLLECTIONS.sources)
    .find({ workspaceId: resolvedWorkspaceId })
    .sort({ createdAt: 1 })
    .toArray();

  const slackInstall = await db
    .collection<SlackInstallation>(COLLECTIONS.slackInstallations)
    .findOne({ workspaceId: resolvedWorkspaceId });

  return sources.map((source) => {
    if (source.platform !== "slack" || !slackInstall) {
      return source;
    }

    return {
      ...source,
      status: "connected" as const,
      lastSyncAt: slackInstall.lastSyncAt ?? source.lastSyncAt,
      updatedAt: slackInstall.updatedAt,
    };
  });
}

export async function createCustomSource(input: {
  workspaceId?: string;
  name?: string;
  identifier: string;
}) {
  const resolvedWorkspaceId = getWorkspaceId(input.workspaceId);
  const now = new Date().toISOString();
  const source: SourceRecord = {
    id: `custom-${randomUUID()}`,
    workspaceId: resolvedWorkspaceId,
    platform: "custom",
    name: input.name?.trim() || "Custom Source",
    description: `Requested connector for ${input.identifier.trim()}.`,
    status: "pending",
    lastSyncAt: null,
    color: "#4F8EF7",
    custom: true,
    createdAt: now,
    updatedAt: now,
  };

  const db = await getDb();
  if (!db) {
    getRuntimeWorkspaceState(resolvedWorkspaceId).customSources.set(source.id, source);
    return source;
  }

  await ensureSourceCatalog(resolvedWorkspaceId);
  await db.collection<SourceRecord>(COLLECTIONS.sources).insertOne(source);
  return source;
}

export async function saveSourceConnectionConfig(input: {
  sourceId: string;
  platform: SourcePlatform;
  values: Record<string, string>;
  workspaceId?: string;
  status?: SourceStatus;
}) {
  const resolvedWorkspaceId = getWorkspaceId(input.workspaceId);
  const now = new Date().toISOString();
  const configRecord: SourceConnectionConfigRecord = {
    id: `source-config-${resolvedWorkspaceId}-${input.sourceId}`,
    sourceId: input.sourceId,
    workspaceId: resolvedWorkspaceId,
    platform: input.platform,
    values: input.values,
    createdAt: now,
    updatedAt: now,
  };

  const db = await getDb();
  if (!db) {
    getRuntimeWorkspaceState(resolvedWorkspaceId).sourceConfigs.set(input.sourceId, configRecord);
    return configRecord;
  }

  await ensureSourceCatalog(resolvedWorkspaceId);
  const existingRecord = await db
    .collection<SourceConnectionConfigRecord>(COLLECTIONS.sourceConfigs)
    .findOne({ sourceId: input.sourceId, workspaceId: resolvedWorkspaceId });

  await db.collection<SourceConnectionConfigRecord>(COLLECTIONS.sourceConfigs).updateOne(
    { sourceId: input.sourceId, workspaceId: resolvedWorkspaceId },
    {
      $set: {
        ...configRecord,
        createdAt: existingRecord?.createdAt ?? now,
      },
    },
    { upsert: true },
  );

  if (input.status) {
    await updateSourceStatus({
      sourceId: input.sourceId,
      status: input.status,
      workspaceId: resolvedWorkspaceId,
    });
  }

  return {
    ...configRecord,
    createdAt: existingRecord?.createdAt ?? now,
  };
}

export async function getSourceConnectionConfig(sourceId: string, workspaceId?: string) {
  const resolvedWorkspaceId = getWorkspaceId(workspaceId);
  const db = await getDb();
  if (!db) {
    return getRuntimeWorkspaceState(resolvedWorkspaceId).sourceConfigs.get(sourceId) ?? null;
  }

  await ensureSourceCatalog(resolvedWorkspaceId);
  return db
    .collection<SourceConnectionConfigRecord>(COLLECTIONS.sourceConfigs)
    .findOne({ sourceId, workspaceId: resolvedWorkspaceId });
}

export async function updateSourceStatus(params: {
  sourceId: string;
  status: SourceStatus;
  workspaceId?: string;
}) {
  const resolvedWorkspaceId = getWorkspaceId(params.workspaceId);
  const now = new Date().toISOString();
  const db = await getDb();

  if (!db) {
    const runtimeState = getRuntimeWorkspaceState(resolvedWorkspaceId);
    const sources = getRuntimeSources(resolvedWorkspaceId);
    const source = sources.find((item) => item.id === params.sourceId);
    if (!source) {
      return null;
    }

    const updatedSource = {
      ...source,
      status: params.status,
      lastSyncAt: params.status === "connected" ? now : source.lastSyncAt,
      updatedAt: now,
    };

    if (updatedSource.custom) {
      runtimeState.customSources.set(updatedSource.id, updatedSource);
    } else {
      runtimeState.sourceOverrides.set(updatedSource.id, {
        status: updatedSource.status,
        lastSyncAt: updatedSource.lastSyncAt,
        updatedAt: updatedSource.updatedAt,
      });
    }

    return updatedSource;
  }

  await ensureSourceCatalog(resolvedWorkspaceId);

  const result = await db.collection<SourceRecord>(COLLECTIONS.sources).findOneAndUpdate(
    { id: params.sourceId, workspaceId: resolvedWorkspaceId },
    {
      $set: {
        status: params.status,
        updatedAt: now,
        ...(params.status === "connected" ? { lastSyncAt: now } : {}),
      },
    },
    { returnDocument: "after" },
  );

  return result;
}

export async function getMemoryItems(workspaceId?: string, query?: string) {
  const resolvedWorkspaceId = getWorkspaceId(workspaceId);
  const db = await getDb();

  if (!db) {
    const items = Array.from(getRuntimeWorkspaceState(resolvedWorkspaceId).memoryItems.values());
    return sortByDateDesc(
      items.filter((item) =>
        matchesQuery(
          [item.title, item.content, item.author, item.sourceLabel, item.tags.join(" ")],
          query,
        ),
      ),
    );
  }

  await ensureSourceCatalog(resolvedWorkspaceId);
  const items = await db
    .collection<MemoryItem>(COLLECTIONS.memory)
    .find({ workspaceId: resolvedWorkspaceId })
    .toArray();

  return sortByDateDesc(
    items.filter((item) =>
      matchesQuery(
        [item.title, item.content, item.author, item.sourceLabel, item.tags.join(" ")],
        query,
      ),
    ),
  );
}

export async function getDecisionItems(workspaceId?: string, query?: string) {
  const resolvedWorkspaceId = getWorkspaceId(workspaceId);
  const db = await getDb();

  if (!db) {
    const items = Array.from(getRuntimeWorkspaceState(resolvedWorkspaceId).decisions.values());
    return sortByDateDesc(
      items.filter((item) =>
        matchesQuery(
          [item.title, item.rationale, item.decidedBy, item.context, item.tags.join(" ")],
          query,
        ),
      ),
    );
  }

  await ensureSourceCatalog(resolvedWorkspaceId);
  const items = await db
    .collection<DecisionItem>(COLLECTIONS.decisions)
    .find({ workspaceId: resolvedWorkspaceId })
    .toArray();

  return sortByDateDesc(
    items.filter((item) =>
      matchesQuery(
        [item.title, item.rationale, item.decidedBy, item.context, item.tags.join(" ")],
        query,
      ),
    ),
  );
}

export async function getKnowledgeDocuments(workspaceId?: string) {
  const resolvedWorkspaceId = getWorkspaceId(workspaceId);
  const db = await getDb();

  if (!db) {
    return Array.from(getRuntimeWorkspaceState(resolvedWorkspaceId).knowledgeDocuments.values());
  }

  await ensureSourceCatalog(resolvedWorkspaceId);
  return db
    .collection<KnowledgeDocument>(COLLECTIONS.knowledge)
    .find({ workspaceId: resolvedWorkspaceId })
    .toArray();
}

export async function upsertKnowledgeDocument(document: KnowledgeDocument) {
  const db = await getDb();
  if (!db) {
    const runtimeState = getRuntimeWorkspaceState(document.workspaceId);
    const existingDocument = runtimeState.knowledgeDocuments.get(document.id);
    const nextDocument = {
      ...document,
      createdAt: existingDocument?.createdAt ?? document.createdAt,
    };
    runtimeState.knowledgeDocuments.set(document.id, nextDocument);
    return nextDocument;
  }

  const existingDocument = await db
    .collection<KnowledgeDocument>(COLLECTIONS.knowledge)
    .findOne(
      { id: document.id, workspaceId: document.workspaceId },
      { projection: { createdAt: 1 } },
    );
  const nextDocument = {
    ...document,
    createdAt: existingDocument?.createdAt ?? document.createdAt,
  };

  await db.collection<KnowledgeDocument>(COLLECTIONS.knowledge).updateOne(
    { id: document.id, workspaceId: document.workspaceId },
    { $set: nextDocument },
    { upsert: true },
  );

  return nextDocument;
}

export async function upsertMemoryItem(item: MemoryItem) {
  const db = await getDb();
  if (!db) {
    const runtimeState = getRuntimeWorkspaceState(item.workspaceId);
    const existingItem = runtimeState.memoryItems.get(item.id);
    const nextItem = {
      ...item,
      createdAt: existingItem?.createdAt ?? item.createdAt,
    };
    runtimeState.memoryItems.set(item.id, nextItem);
    return nextItem;
  }

  const existingItem = await db
    .collection<MemoryItem>(COLLECTIONS.memory)
    .findOne({ id: item.id, workspaceId: item.workspaceId }, { projection: { createdAt: 1 } });
  const nextItem = {
    ...item,
    createdAt: existingItem?.createdAt ?? item.createdAt,
  };

  await db.collection<MemoryItem>(COLLECTIONS.memory).updateOne(
    { id: item.id, workspaceId: item.workspaceId },
    { $set: nextItem },
    { upsert: true },
  );

  return nextItem;
}

export async function saveSlackInstallation(installation: SlackInstallation) {
  const db = await getDb();
  if (!db) {
    getRuntimeWorkspaceState(installation.workspaceId).slackInstallations.set(
      installation.teamId,
      installation,
    );
    await updateSourceStatus({
      sourceId: "slack",
      status: "connected",
      workspaceId: installation.workspaceId,
    });
    return installation;
  }

  await ensureSourceCatalog(installation.workspaceId);

  await db.collection<SlackInstallation>(COLLECTIONS.slackInstallations).updateOne(
    { workspaceId: installation.workspaceId, teamId: installation.teamId },
    { $set: installation },
    { upsert: true },
  );

  await updateSourceStatus({
    sourceId: "slack",
    status: "connected",
    workspaceId: installation.workspaceId,
  });

  return installation;
}

export async function getSlackInstallation(workspaceId?: string) {
  const resolvedWorkspaceId = getWorkspaceId(workspaceId);
  const db = await getDb();
  if (!db) {
    return Array.from(getRuntimeWorkspaceState(resolvedWorkspaceId).slackInstallations.values())[0] ?? null;
  }

  await ensureSourceCatalog(resolvedWorkspaceId);
  return db
    .collection<SlackInstallation>(COLLECTIONS.slackInstallations)
    .findOne({ workspaceId: resolvedWorkspaceId });
}

export async function getSlackInstallationByTeamId(teamId: string, workspaceId?: string) {
  const resolvedWorkspaceId = getWorkspaceId(workspaceId);
  const db = await getDb();
  if (!db) {
    return getRuntimeWorkspaceState(resolvedWorkspaceId).slackInstallations.get(teamId) ?? null;
  }

  await ensureSourceCatalog(resolvedWorkspaceId);
  return db
    .collection<SlackInstallation>(COLLECTIONS.slackInstallations)
    .findOne({ workspaceId: resolvedWorkspaceId, teamId });
}

export async function deleteSlackInstallation(workspaceId?: string) {
  const resolvedWorkspaceId = getWorkspaceId(workspaceId);
  const db = await getDb();
  if (!db) {
    const runtimeState = getRuntimeWorkspaceState(resolvedWorkspaceId);
    runtimeState.slackInstallations.clear();
    await updateSourceStatus({
      sourceId: "slack",
      status: "disconnected",
      workspaceId: resolvedWorkspaceId,
    });
    return;
  }

  await ensureSourceCatalog(resolvedWorkspaceId);
  await db
    .collection<SlackInstallation>(COLLECTIONS.slackInstallations)
    .deleteMany({ workspaceId: resolvedWorkspaceId });

  await updateSourceStatus({
    sourceId: "slack",
    status: "disconnected",
    workspaceId: resolvedWorkspaceId,
  });
}
