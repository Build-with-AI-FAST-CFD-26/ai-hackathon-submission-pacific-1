import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { serverEnv } from "@/lib/env";
import {
  deleteSlackInstallation,
  getSlackInstallation,
  getSlackInstallationByTeamId,
  getSourceConnectionConfig,
  saveSlackInstallation,
  updateSourceStatus,
  upsertKnowledgeDocument,
  upsertMemoryItem,
} from "@/lib/sync-repository";
import type { KnowledgeDocument, MemoryItem, SlackInstallation } from "@/types/sync";

interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  access_token?: string;
  token_type?: string;
  scope?: string;
  bot_user_id?: string;
  app_id?: string;
  team?: {
    id: string;
    name: string;
  };
  enterprise?: {
    id?: string;
    name?: string;
  };
  authed_user?: {
    id?: string;
  };
}

interface SlackConversation {
  id: string;
  name?: string;
  is_member?: boolean;
  is_archived?: boolean;
}

interface SlackMessage {
  ts?: string;
  text?: string;
  user?: string;
  subtype?: string;
  hidden?: boolean;
}

interface SlackUser {
  id: string;
  deleted?: boolean;
  is_bot?: boolean;
  name?: string;
  real_name?: string;
  updated?: number;
  profile?: {
    email?: string;
    display_name?: string;
    real_name?: string;
    title?: string;
  };
}

interface SlackConnectorSecrets {
  clientId?: string;
  clientSecret?: string;
  signingSecret?: string;
}

function getSlackRedirectUri(baseUrl: string) {
  return serverEnv.SLACK_REDIRECT_URI ?? `${baseUrl}/api/integrations/slack/callback`;
}

function getBaseUrl(requestUrl: string) {
  return serverEnv.APP_BASE_URL ?? new URL(requestUrl).origin;
}

async function slackApiRequest<T>(
  url: string,
  init: RequestInit,
  errorMessage: string,
): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${errorMessage}: Slack returned ${response.status}`);
  }

  const payload = (await response.json()) as T & { ok?: boolean; error?: string };
  if ("ok" in payload && payload.ok === false) {
    throw new Error(`${errorMessage}: ${payload.error ?? "Unknown Slack error"}`);
  }

  return payload as T;
}

async function getSlackConnectorSecrets(workspaceId?: string): Promise<SlackConnectorSecrets> {
  const config = await getSourceConnectionConfig("slack", workspaceId);
  return {
    clientId: config?.values.clientId ?? serverEnv.SLACK_CLIENT_ID ?? undefined,
    clientSecret: config?.values.clientSecret ?? serverEnv.SLACK_CLIENT_SECRET ?? undefined,
    signingSecret: config?.values.signingSecret ?? serverEnv.SLACK_SIGNING_SECRET ?? undefined,
  };
}

export async function getSlackAuthUrl(requestUrl: string, workspaceId?: string) {
  const secrets = await getSlackConnectorSecrets(workspaceId);
  if (!secrets.clientId || !secrets.clientSecret) {
    throw new Error("Slack OAuth is not configured. Add SLACK_CLIENT_ID and SLACK_CLIENT_SECRET.");
  }

  const baseUrl = getBaseUrl(requestUrl);
  const redirectUri = getSlackRedirectUri(baseUrl);
  const state = randomUUID();
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", secrets.clientId);
  url.searchParams.set("scope", serverEnv.SLACK_SCOPES);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  if (workspaceId) {
    url.searchParams.set("metadata", workspaceId);
  }

  return {
    url: url.toString(),
    state,
    workspaceId: workspaceId ?? serverEnv.SYNC_DEFAULT_WORKSPACE_ID,
  };
}

export async function exchangeSlackCodeForInstallation(params: {
  code: string;
  requestUrl: string;
  workspaceId?: string;
}) {
  const secrets = await getSlackConnectorSecrets(params.workspaceId);
  if (!secrets.clientId || !secrets.clientSecret) {
    throw new Error("Slack OAuth credentials are missing.");
  }

  const baseUrl = getBaseUrl(params.requestUrl);
  const redirectUri = getSlackRedirectUri(baseUrl);
  const form = new URLSearchParams();
  form.set("client_id", secrets.clientId);
  form.set("client_secret", secrets.clientSecret);
  form.set("code", params.code);
  form.set("redirect_uri", redirectUri);

  const payload = await slackApiRequest<SlackOAuthResponse>(
    "https://slack.com/api/oauth.v2.access",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    },
    "Slack OAuth exchange failed",
  );

  if (!payload.access_token || !payload.team?.id || !payload.team.name) {
    throw new Error("Slack OAuth exchange did not return installation details.");
  }

  const now = new Date().toISOString();
  const installation: SlackInstallation = {
    id: `slack-installation-${payload.team.id}`,
    workspaceId: params.workspaceId ?? serverEnv.SYNC_DEFAULT_WORKSPACE_ID,
    teamId: payload.team.id,
    teamName: payload.team.name,
    accessToken: payload.access_token,
    tokenType: payload.token_type ?? "bot",
    scope: payload.scope ?? "",
    botUserId: payload.bot_user_id,
    authedUserId: payload.authed_user?.id,
    appId: payload.app_id,
    enterpriseId: payload.enterprise?.id ?? null,
    enterpriseName: payload.enterprise?.name ?? null,
    installedAt: now,
    updatedAt: now,
    lastSyncAt: null,
  };

  await saveSlackInstallation(installation);
  return installation;
}

export async function getStoredSlackInstallation(workspaceId?: string) {
  return getSlackInstallation(workspaceId);
}

export async function uninstallSlack(workspaceId?: string) {
  const installation = await getSlackInstallation(workspaceId);
  if (!installation) {
    return;
  }

  try {
    await fetch("https://slack.com/api/auth.revoke", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${installation.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ test: "false" }).toString(),
    });
  } catch (error) {
    console.error("Slack token revoke failed, removing local installation anyway.", error);
  }

  await deleteSlackInstallation(workspaceId);
}

async function fetchSlackUsers(accessToken: string) {
  const users: SlackUser[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL("https://slack.com/api/users.list");
    url.searchParams.set("limit", "200");
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const payload = await slackApiRequest<{
      ok: boolean;
      members?: SlackUser[];
      response_metadata?: { next_cursor?: string };
    }>(
      url.toString(),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      "Slack users.list failed",
    );

    users.push(...(payload.members ?? []));
    cursor = payload.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return users;
}

function buildSlackUserMap(users: SlackUser[]) {
  return new Map(
    users.map((user) => [
      user.id,
      user.profile?.display_name || user.real_name || user.profile?.real_name || user.name || user.id,
    ]),
  );
}

function buildSlackMemberDocument(params: {
  installation: SlackInstallation;
  user: SlackUser;
  observedAt: string;
  syncedAt: string;
  source: "snapshot" | "team_join" | "user_change";
}): { document: KnowledgeDocument; memoryItem: MemoryItem } | null {
  if (!params.user.id || params.user.deleted || params.user.is_bot) {
    return null;
  }

  const displayName =
    params.user.profile?.display_name ||
    params.user.real_name ||
    params.user.profile?.real_name ||
    params.user.name ||
    params.user.id;
  const email = params.user.profile?.email;
  const title = params.user.profile?.title;
  const createdAt = params.observedAt;
  const discoveredLine =
    params.source === "team_join"
      ? `Joined Slack workspace at: ${createdAt}.`
      : `First indexed by Sync at: ${createdAt}.`;
  const lines = [
    `Slack workspace member: ${displayName}.`,
    title ? `Role or title: ${title}.` : null,
    email ? `Email: ${email}.` : null,
    discoveredLine,
    `Workspace: ${params.installation.teamName}.`,
  ].filter(Boolean);
  const content = lines.join(" ");
  const documentId = `slack-member-${params.installation.teamId}-${params.user.id}`;

  return {
    document: {
      id: documentId,
      workspaceId: params.installation.workspaceId,
      platform: "slack",
      title: `Slack member: ${displayName}`,
      sourceLabel: "Slack / Members",
      author: "Slack directory",
      content,
      excerpt: content,
      tags: ["Slack", "Member", params.installation.teamName],
      createdAt,
      updatedAt: params.syncedAt,
      url: "https://slack.com/account/team",
    },
    memoryItem: {
      id: `memory-${documentId}`,
      workspaceId: params.installation.workspaceId,
      documentId,
      platform: "slack",
      title: `Slack member: ${displayName}`,
      sourceLabel: "Slack / Members",
      author: "Slack directory",
      createdAt,
      content,
      tags: ["Slack", "Member"],
      url: "https://slack.com/account/team",
    },
  };
}

async function fetchSlackConversations(accessToken: string) {
  const channels: SlackConversation[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL("https://slack.com/api/conversations.list");
    url.searchParams.set("exclude_archived", "true");
    url.searchParams.set("limit", "100");
    url.searchParams.set("types", "public_channel,private_channel,im,mpim");
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const payload = await slackApiRequest<{
      ok: boolean;
      channels?: SlackConversation[];
      response_metadata?: { next_cursor?: string };
    }>(
      url.toString(),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      "Slack conversations.list failed",
    );

    channels.push(...(payload.channels ?? []));
    cursor = payload.response_metadata?.next_cursor || undefined;
  } while (cursor && channels.length < serverEnv.SLACK_SYNC_CHANNEL_LIMIT);

  return channels
    .filter((channel) => !channel.is_archived && channel.is_member !== false)
    .slice(0, serverEnv.SLACK_SYNC_CHANNEL_LIMIT);
}

async function fetchSlackConversationHistory(accessToken: string, channelId: string) {
  const url = new URL("https://slack.com/api/conversations.history");
  url.searchParams.set("channel", channelId);
  url.searchParams.set("limit", String(serverEnv.SLACK_SYNC_MESSAGE_LIMIT));

  const payload = await slackApiRequest<{ ok: boolean; messages?: SlackMessage[] }>(
    url.toString(),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    "Slack conversations.history failed",
  );

  return payload.messages ?? [];
}

async function fetchSlackConversationName(accessToken: string, channelId: string) {
  const url = new URL("https://slack.com/api/conversations.info");
  url.searchParams.set("channel", channelId);

  const payload = await slackApiRequest<{
    ok: boolean;
    channel?: SlackConversation;
  }>(
    url.toString(),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    "Slack conversations.info failed",
  );

  return payload.channel?.name ?? channelId;
}

function normalizeSlackText(text?: string) {
  return (text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function toIsoFromSlackTimestamp(timestamp?: string) {
  if (!timestamp) {
    return null;
  }

  const seconds = Number(timestamp.split(".")[0]);
  if (!Number.isFinite(seconds)) {
    return null;
  }

  return new Date(seconds * 1000).toISOString();
}

function shouldAutoSync(lastSyncAt: string | null, maxAgeMs: number) {
  if (!lastSyncAt) {
    return true;
  }

  const lastSyncMs = new Date(lastSyncAt).getTime();
  if (!Number.isFinite(lastSyncMs)) {
    return true;
  }

  return Date.now() - lastSyncMs >= maxAgeMs;
}

async function upsertSlackMember(params: {
  installation: SlackInstallation;
  user: SlackUser;
  observedAt: string;
  syncedAt: string;
  source: "snapshot" | "team_join" | "user_change";
}) {
  const memberDocument = buildSlackMemberDocument(params);

  if (!memberDocument) {
    return;
  }

  await upsertKnowledgeDocument(memberDocument.document);
  await upsertMemoryItem(memberDocument.memoryItem);
}

async function syncSlackInstallation(installation: SlackInstallation) {
  const syncStartedAt = new Date().toISOString();
  const users = await fetchSlackUsers(installation.accessToken);
  const userMap = buildSlackUserMap(users);
  const channels = await fetchSlackConversations(installation.accessToken);

  for (const user of users) {
    await upsertSlackMember({
      installation,
      user,
      observedAt: syncStartedAt,
      syncedAt: syncStartedAt,
      source: "snapshot",
    });
  }

  for (const channel of channels) {
    const channelName = channel.name ?? channel.id;
    try {
      const messages = await fetchSlackConversationHistory(installation.accessToken, channel.id);

      for (const message of messages.filter(isIngestibleSlackMessage)) {
        const authorName = userMap.get(message.user ?? "") ?? message.user ?? "Slack user";
        const formatted = formatSlackDocument({
          installation,
          channelId: channel.id,
          channelName,
          message,
          authorName,
        });

        if (!formatted) {
          continue;
        }

        await upsertKnowledgeDocument(formatted.document);
        await upsertMemoryItem(formatted.memoryItem);
      }
    } catch (error) {
      console.warn(`Failed to sync channel ${channelName} (${channel.id}):`, error);
    }
  }

  const now = new Date().toISOString();
  await saveSlackInstallation({
    ...installation,
    updatedAt: now,
    lastSyncAt: now,
  });

  return {
    syncedChannels: channels.length,
    lastSyncAt: now,
  };
}

function formatSlackDocument(params: {
  installation: SlackInstallation;
  channelId: string;
  channelName: string;
  message: SlackMessage;
  authorName: string;
}): { document: KnowledgeDocument; memoryItem: MemoryItem } | null {
  if (!params.message.ts) {
    return null;
  }

  const text = normalizeSlackText(params.message.text);
  if (!text) {
    return null;
  }

  const createdAt = new Date(Number(params.message.ts.split(".")[0]) * 1000).toISOString();
  const excerpt = text.length > 220 ? `${text.slice(0, 217)}...` : text;
  const titleBase = text.length > 72 ? `${text.slice(0, 69)}...` : text;
  const documentId = `slack-${params.channelId}-${params.message.ts.replace(".", "-")}`;
  const sourceLabel = `Slack / #${params.channelName}`;
  const url = `https://slack.com/app_redirect?channel=${params.channelId}`;

  return {
    document: {
      id: documentId,
      workspaceId: params.installation.workspaceId,
      platform: "slack",
      title: `Slack message: ${titleBase}`,
      sourceLabel,
      author: params.authorName,
      content: text,
      excerpt,
      tags: ["Slack", params.channelName],
      createdAt,
      updatedAt: createdAt,
      url,
    },
    memoryItem: {
      id: `memory-${documentId}`,
      workspaceId: params.installation.workspaceId,
      documentId,
      platform: "slack",
      title: `#${params.channelName}`,
      sourceLabel: `#${params.channelName}`,
      author: params.authorName,
      createdAt,
      content: excerpt,
      tags: ["Slack", "Ingested"],
      url,
    },
  };
}

function isIngestibleSlackMessage(message: SlackMessage) {
  return Boolean(
    message.ts &&
      !message.hidden &&
      !message.subtype &&
      normalizeSlackText(message.text).length > 0,
  );
}

export async function syncSlackWorkspaceInstallation(workspaceId?: string) {
  const installation = await getSlackInstallation(workspaceId);
  if (!installation) {
    throw new Error("No Slack installation found for this workspace.");
  }

  return syncSlackInstallation(installation);
}

export async function refreshSlackWorkspaceIfStale(params?: {
  workspaceId?: string;
  maxAgeMs?: number;
}) {
  const installation = await getSlackInstallation(params?.workspaceId);
  if (!installation) {
    return { refreshed: false, reason: "not_connected" as const };
  }

  const maxAgeMs =
    params?.maxAgeMs ?? serverEnv.SLACK_AUTO_SYNC_MAX_AGE_SECONDS * 1000;

  if (!shouldAutoSync(installation.lastSyncAt, maxAgeMs)) {
    return {
      refreshed: false,
      reason: "fresh" as const,
      lastSyncAt: installation.lastSyncAt,
    };
  }

  const result = await syncSlackInstallation(installation);
  return {
    refreshed: true,
    reason: "stale" as const,
    lastSyncAt: result.lastSyncAt,
  };
}

export async function ingestSlackEvent(params: {
  teamId: string;
  channelId: string;
  text?: string;
  ts?: string;
  userId?: string;
}) {
  const installation = await getSlackInstallationByTeamId(params.teamId);
  if (!installation || !params.ts || !normalizeSlackText(params.text)) {
    return;
  }

  const userMap = buildSlackUserMap(await fetchSlackUsers(installation.accessToken));
  const channelName = await fetchSlackConversationName(installation.accessToken, params.channelId);
  const authorName = userMap.get(params.userId ?? "") ?? params.userId ?? "Slack user";
  const formatted = formatSlackDocument({
    installation,
    channelId: params.channelId,
    channelName,
    message: {
      ts: params.ts,
      text: params.text,
      user: params.userId,
    },
    authorName,
  });

  if (!formatted) {
    return;
  }

  await upsertKnowledgeDocument(formatted.document);
  await upsertMemoryItem(formatted.memoryItem);
  await saveSlackInstallation({
    ...installation,
    updatedAt: new Date().toISOString(),
    lastSyncAt: new Date().toISOString(),
  });
  await updateSourceStatus({
    sourceId: "slack",
    status: "connected",
    workspaceId: installation.workspaceId,
  });
}

export async function ingestSlackMemberEvent(params: {
  teamId: string;
  user: SlackUser;
  eventTs?: string;
  source: "team_join" | "user_change";
}) {
  const installation = await getSlackInstallationByTeamId(params.teamId);
  if (!installation) {
    return;
  }

  const syncedAt = new Date().toISOString();
  await upsertSlackMember({
    installation,
    user: params.user,
    observedAt: toIsoFromSlackTimestamp(params.eventTs) ?? syncedAt,
    syncedAt,
    source: params.source,
  });

  await saveSlackInstallation({
    ...installation,
    updatedAt: syncedAt,
    lastSyncAt: syncedAt,
  });
  await updateSourceStatus({
    sourceId: "slack",
    status: "connected",
    workspaceId: installation.workspaceId,
  });
}

export async function verifySlackRequestSignature(body: string, headers: Headers) {
  const secrets = await getSlackConnectorSecrets();
  if (!secrets.signingSecret) {
    return true;
  }

  const timestamp = headers.get("x-slack-request-timestamp");
  const signature = headers.get("x-slack-signature");
  if (!timestamp || !signature) {
    return false;
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (age > 60 * 5) {
    return false;
  }

  const basestring = `v0:${timestamp}:${body}`;
  const digest = `v0=${createHmac("sha256", secrets.signingSecret)
    .update(basestring)
    .digest("hex")}`;

  return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
