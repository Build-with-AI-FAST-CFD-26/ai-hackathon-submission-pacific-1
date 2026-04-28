import { randomUUID } from "crypto";
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

const GMAIL_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ");

interface GmailTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface GmailProfileResponse {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

interface GmailMessageListResponse {
  messages?: Array<{ id: string; threadId: string }>;
}

interface GmailMessageResponse {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
  };
}

function getBaseUrl(requestUrl: string) {
  return serverEnv.APP_BASE_URL ?? new URL(requestUrl).origin;
}

function getGmailRedirectUri(baseUrl: string) {
  return `${baseUrl}/api/integrations/gmail/callback`;
}

function getWorkspaceId(workspaceId?: string) {
  return workspaceId ?? serverEnv.SYNC_DEFAULT_WORKSPACE_ID;
}

async function getGmailConfig(workspaceId?: string) {
  const config = await getSourceConnectionConfig("gmail", workspaceId);
  return config?.values ?? {};
}

async function gmailTokenRequest(form: URLSearchParams) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const payload = (await response.json()) as GmailTokenResponse;
  if (!response.ok || payload.error) {
    throw new Error(payload.error_description ?? payload.error ?? "Google token exchange failed.");
  }

  return payload;
}

async function gmailApiRequest<T>(accessToken: string, url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as T;
}

function getHeaderValue(
  headers: Array<{ name?: string; value?: string }> | undefined,
  headerName: string,
) {
  return headers?.find((header) => header.name?.toLowerCase() === headerName.toLowerCase())?.value;
}

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function formatGmailMessage(params: {
  workspaceId: string;
  connectedEmail: string;
  message: GmailMessageResponse;
}): { document: KnowledgeDocument; memoryItem: MemoryItem } | null {
  const subject =
    getHeaderValue(params.message.payload?.headers, "Subject")?.trim() || "(no subject)";
  const from = getHeaderValue(params.message.payload?.headers, "From")?.trim() || "Unknown sender";
  const to = getHeaderValue(params.message.payload?.headers, "To")?.trim();
  const sentAtHeader = getHeaderValue(params.message.payload?.headers, "Date")?.trim();
  const snippet = params.message.snippet?.trim();

  if (!snippet && !subject) {
    return null;
  }

  const createdAt = params.message.internalDate
    ? new Date(Number(params.message.internalDate)).toISOString()
    : sentAtHeader && !Number.isNaN(Date.parse(sentAtHeader))
      ? new Date(sentAtHeader).toISOString()
      : new Date().toISOString();
  const excerpt = truncate(snippet || subject, 220);
  const url = `https://mail.google.com/mail/u/0/#all/${params.message.id}`;
  const documentId = `gmail-${params.message.id}`;
  const contentParts = [
    `Subject: ${subject}.`,
    `From: ${from}.`,
    to ? `To: ${to}.` : null,
    sentAtHeader ? `Date: ${sentAtHeader}.` : null,
    snippet ? `Snippet: ${snippet}.` : null,
  ].filter(Boolean);
  const content = contentParts.join(" ");

  return {
    document: {
      id: documentId,
      workspaceId: params.workspaceId,
      platform: "gmail",
      title: `Email: ${truncate(subject, 80)}`,
      sourceLabel: "Gmail / Inbox",
      author: from,
      content,
      excerpt,
      tags: ["Gmail", params.connectedEmail],
      createdAt,
      updatedAt: createdAt,
      url,
    },
    memoryItem: {
      id: `memory-${documentId}`,
      workspaceId: params.workspaceId,
      documentId,
      platform: "gmail",
      title: subject,
      sourceLabel: "Gmail / Inbox",
      author: from,
      createdAt,
      content: excerpt,
      tags: ["Gmail", "Inbox"],
      url,
    },
  };
}

async function persistGmailTokens(input: {
  workspaceId?: string;
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  expiresIn?: number;
  connectedEmail?: string;
  gmailUserId?: string;
  watchExpiration?: string;
}) {
  const workspaceId = getWorkspaceId(input.workspaceId);
  const currentConfig = await getGmailConfig(workspaceId);
  const now = Date.now();

  await saveSourceConnectionConfig({
    sourceId: "gmail",
    platform: "gmail",
    workspaceId,
    status: "connected",
    values: {
      ...currentConfig,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? currentConfig.refreshToken ?? "",
      tokenType: input.tokenType ?? currentConfig.tokenType ?? "Bearer",
      scope: input.scope ?? currentConfig.scope ?? GMAIL_SCOPES,
      tokenExpiresAt: String(now + (input.expiresIn ?? 3600) * 1000),
      connectedEmail: input.connectedEmail ?? currentConfig.connectedEmail ?? "",
      gmailUserId: input.gmailUserId ?? currentConfig.gmailUserId ?? "",
      watchExpiration: input.watchExpiration ?? currentConfig.watchExpiration ?? "",
    },
  });
}

async function refreshGmailAccessToken(workspaceId?: string) {
  const workspaceIdValue = getWorkspaceId(workspaceId);
  const config = await getGmailConfig(workspaceIdValue);
  const clientId = config.oauthClientId;
  const clientSecret = config.oauthClientSecret;
  const refreshToken = config.refreshToken;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail refresh token is missing. Reconnect Gmail.");
  }

  const form = new URLSearchParams();
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);
  form.set("refresh_token", refreshToken);
  form.set("grant_type", "refresh_token");

  const tokenPayload = await gmailTokenRequest(form);
  if (!tokenPayload.access_token) {
    throw new Error("Google did not return an access token.");
  }

  await persistGmailTokens({
    workspaceId: workspaceIdValue,
    accessToken: tokenPayload.access_token,
    refreshToken: refreshToken,
    tokenType: tokenPayload.token_type,
    scope: tokenPayload.scope,
    expiresIn: tokenPayload.expires_in,
  });

  return tokenPayload.access_token;
}

async function resolveGmailAccessToken(workspaceId?: string) {
  const config = await getGmailConfig(workspaceId);
  const accessToken = config.accessToken;
  const tokenExpiresAt = Number(config.tokenExpiresAt ?? "0");

  if (accessToken && Number.isFinite(tokenExpiresAt) && tokenExpiresAt - Date.now() > 60_000) {
    return accessToken;
  }

  return refreshGmailAccessToken(workspaceId);
}

async function startGmailWatch(workspaceId: string, accessToken: string) {
  const config = await getGmailConfig(workspaceId);
  if (!config.pubsubTopic) {
    return null;
  }

  try {
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/watch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topicName: config.pubsubTopic,
        labelIds: ["INBOX"],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { expiration?: string };
    return payload.expiration ?? null;
  } catch (error) {
    console.warn("Gmail watch registration failed.", error);
    return null;
  }
}

export async function getGmailAuthUrl(requestUrl: string, workspaceId?: string) {
  const workspaceIdValue = getWorkspaceId(workspaceId);
  const config = await getGmailConfig(workspaceIdValue);

  if (!config.oauthClientId || !config.oauthClientSecret) {
    throw new Error("Gmail OAuth is not configured. Add the Google OAuth client ID and secret.");
  }

  const baseUrl = getBaseUrl(requestUrl);
  const redirectUri = getGmailRedirectUri(baseUrl);
  const state = randomUUID();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.oauthClientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);

  return {
    url: url.toString(),
    state,
    workspaceId: workspaceIdValue,
  };
}

export async function exchangeGmailCode(params: {
  code: string;
  requestUrl: string;
  workspaceId?: string;
}) {
  const workspaceId = getWorkspaceId(params.workspaceId);
  const config = await getGmailConfig(workspaceId);
  const baseUrl = getBaseUrl(params.requestUrl);
  const redirectUri = getGmailRedirectUri(baseUrl);

  if (!config.oauthClientId || !config.oauthClientSecret) {
    throw new Error("Gmail OAuth is not configured.");
  }

  const form = new URLSearchParams();
  form.set("client_id", config.oauthClientId);
  form.set("client_secret", config.oauthClientSecret);
  form.set("code", params.code);
  form.set("grant_type", "authorization_code");
  form.set("redirect_uri", redirectUri);

  const tokenPayload = await gmailTokenRequest(form);
  if (!tokenPayload.access_token) {
    throw new Error("Google did not return an access token.");
  }

  const profile = await gmailApiRequest<GmailProfileResponse>(
    tokenPayload.access_token,
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
  );

  await persistGmailTokens({
    workspaceId,
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token,
    tokenType: tokenPayload.token_type,
    scope: tokenPayload.scope,
    expiresIn: tokenPayload.expires_in,
    connectedEmail: profile.emailAddress,
    gmailUserId: profile.historyId,
  });

  return {
    emailAddress: profile.emailAddress,
    workspaceId,
  };
}

export async function syncGmailWorkspace(workspaceId?: string) {
  const workspaceIdValue = getWorkspaceId(workspaceId);
  const accessToken = await resolveGmailAccessToken(workspaceIdValue);
  const profile = await gmailApiRequest<GmailProfileResponse>(
    accessToken,
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
  );

  const messageList = await gmailApiRequest<GmailMessageListResponse>(
    accessToken,
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults=20",
  );

  let syncedMessages = 0;
  for (const messageRef of messageList.messages ?? []) {
    try {
      const message = await gmailApiRequest<GmailMessageResponse>(
        accessToken,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageRef.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
      );
      const formatted = formatGmailMessage({
        workspaceId: workspaceIdValue,
        connectedEmail: profile.emailAddress,
        message,
      });

      if (!formatted) {
        continue;
      }

      await upsertKnowledgeDocument(formatted.document);
      await upsertMemoryItem(formatted.memoryItem);
      syncedMessages += 1;
    } catch (error) {
      console.warn(`Failed to sync Gmail message ${messageRef.id}.`, error);
    }
  }

  const watchExpiration = await startGmailWatch(workspaceIdValue, accessToken);
  await persistGmailTokens({
    workspaceId: workspaceIdValue,
    accessToken,
    connectedEmail: profile.emailAddress,
    gmailUserId: profile.historyId,
    watchExpiration: watchExpiration ?? undefined,
  });

  await updateSourceStatus({
    sourceId: "gmail",
    status: "connected",
    workspaceId: workspaceIdValue,
  });

  return {
    emailAddress: profile.emailAddress,
    syncedMessages,
    watchExpiration,
  };
}

export async function disconnectGmail(workspaceId?: string) {
  const workspaceIdValue = getWorkspaceId(workspaceId);
  await deleteSourceConnectionConfig("gmail", workspaceIdValue);
  await updateSourceStatus({
    sourceId: "gmail",
    status: "disconnected",
    workspaceId: workspaceIdValue,
  });
}
