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

const GITHUB_SCOPES = ["repo", "read:user", "user:email", "read:org"].join(" ");

interface GitHubTokenResponse {
  access_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUser {
  login: string;
  name?: string | null;
  html_url: string;
}

interface GitHubRepo {
  id: number;
  full_name: string;
  description?: string | null;
  html_url: string;
  private: boolean;
  updated_at: string;
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string | null;
  html_url: string;
  state: string;
  updated_at: string;
  user?: {
    login?: string;
  };
  pull_request?: {
    url: string;
  };
}

function getBaseUrl(requestUrl: string) {
  return serverEnv.APP_BASE_URL ?? new URL(requestUrl).origin;
}

function getGitHubRedirectUri(baseUrl: string) {
  return `${baseUrl}/api/integrations/github/callback`;
}

function getWorkspaceId(workspaceId?: string) {
  return workspaceId ?? serverEnv.SYNC_DEFAULT_WORKSPACE_ID;
}

async function getGitHubConfig(workspaceId?: string) {
  const config = await getSourceConnectionConfig("github", workspaceId);
  return config?.values ?? {};
}

async function githubApiRequest<T>(accessToken: string, url: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Sync-AI",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as T;
}

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function formatGitHubIssue(params: {
  workspaceId: string;
  repoFullName: string;
  issue: GitHubIssue;
}): { document: KnowledgeDocument; memoryItem: MemoryItem } {
  const isPullRequest = Boolean(params.issue.pull_request);
  const kindLabel = isPullRequest ? "Pull request" : "Issue";
  const createdAt = params.issue.updated_at;
  const excerpt = truncate((params.issue.body || params.issue.title).trim(), 220);
  const content = [
    `${kindLabel}: ${params.issue.title}.`,
    `Repository: ${params.repoFullName}.`,
    `State: ${params.issue.state}.`,
    params.issue.body ? `Body: ${params.issue.body}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const documentId = `github-${params.issue.id}`;

  return {
    document: {
      id: documentId,
      workspaceId: params.workspaceId,
      platform: "github",
      title: `${kindLabel}: ${truncate(params.issue.title, 90)}`,
      sourceLabel: `GitHub / ${params.repoFullName}`,
      author: params.issue.user?.login ?? "GitHub",
      content,
      excerpt,
      tags: ["GitHub", kindLabel, params.repoFullName],
      createdAt,
      updatedAt: createdAt,
      url: params.issue.html_url,
    },
    memoryItem: {
      id: `memory-${documentId}`,
      workspaceId: params.workspaceId,
      documentId,
      platform: "github",
      title: `${params.repoFullName} #${params.issue.number}`,
      sourceLabel: `GitHub / ${params.repoFullName}`,
      author: params.issue.user?.login ?? "GitHub",
      createdAt,
      content: excerpt,
      tags: ["GitHub", kindLabel],
      url: params.issue.html_url,
    },
  };
}

async function persistGitHubToken(input: {
  workspaceId?: string;
  accessToken: string;
  tokenType?: string;
  scope?: string;
  login?: string;
  profileUrl?: string;
}) {
  const workspaceId = getWorkspaceId(input.workspaceId);
  const currentConfig = await getGitHubConfig(workspaceId);

  await saveSourceConnectionConfig({
    sourceId: "github",
    platform: "github",
    workspaceId,
    status: "connected",
    values: {
      ...currentConfig,
      accessToken: input.accessToken,
      tokenType: input.tokenType ?? currentConfig.tokenType ?? "bearer",
      scope: input.scope ?? currentConfig.scope ?? GITHUB_SCOPES,
      login: input.login ?? currentConfig.login ?? "",
      profileUrl: input.profileUrl ?? currentConfig.profileUrl ?? "",
    },
  });
}

export async function getGitHubAuthUrl(requestUrl: string, workspaceId?: string) {
  const workspaceIdValue = getWorkspaceId(workspaceId);
  const config = await getGitHubConfig(workspaceIdValue);
  if (!config.clientId || !config.clientSecret) {
    throw new Error("GitHub OAuth is not configured. Add the GitHub client ID and secret.");
  }

  const state = randomUUID();
  const baseUrl = getBaseUrl(requestUrl);
  const redirectUri = getGitHubRedirectUri(baseUrl);
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", GITHUB_SCOPES);
  url.searchParams.set("state", state);

  return {
    url: url.toString(),
    state,
    workspaceId: workspaceIdValue,
  };
}

export async function exchangeGitHubCode(params: {
  code: string;
  requestUrl: string;
  workspaceId?: string;
}) {
  const workspaceId = getWorkspaceId(params.workspaceId);
  const config = await getGitHubConfig(workspaceId);
  const baseUrl = getBaseUrl(params.requestUrl);
  const redirectUri = getGitHubRedirectUri(baseUrl);

  if (!config.clientId || !config.clientSecret) {
    throw new Error("GitHub OAuth is not configured.");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: params.code,
      redirect_uri: redirectUri,
    }),
  });

  const payload = (await response.json()) as GitHubTokenResponse;
  if (!response.ok || payload.error || !payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? "GitHub token exchange failed.");
  }

  const user = await githubApiRequest<GitHubUser>(payload.access_token, "https://api.github.com/user");
  await persistGitHubToken({
    workspaceId,
    accessToken: payload.access_token,
    tokenType: payload.token_type,
    scope: payload.scope,
    login: user.login,
    profileUrl: user.html_url,
  });

  return {
    login: user.login,
    workspaceId,
  };
}

export async function syncGitHubWorkspace(workspaceId?: string) {
  const workspaceIdValue = getWorkspaceId(workspaceId);
  const config = await getGitHubConfig(workspaceIdValue);
  if (!config.accessToken) {
    throw new Error("GitHub access token is missing. Connect GitHub first.");
  }

  const user = await githubApiRequest<GitHubUser>(config.accessToken, "https://api.github.com/user");
  const repos = await githubApiRequest<GitHubRepo[]>(
    config.accessToken,
    "https://api.github.com/user/repos?sort=updated&per_page=8&affiliation=owner,collaborator,organization_member",
  );

  let syncedItems = 0;
  for (const repo of repos) {
    const issues = await githubApiRequest<GitHubIssue[]>(
      config.accessToken,
      `https://api.github.com/repos/${repo.full_name}/issues?state=all&sort=updated&direction=desc&per_page=5`,
    );

    for (const issue of issues) {
      const formatted = formatGitHubIssue({
        workspaceId: workspaceIdValue,
        repoFullName: repo.full_name,
        issue,
      });
      await upsertKnowledgeDocument(formatted.document);
      await upsertMemoryItem(formatted.memoryItem);
      syncedItems += 1;
    }
  }

  await persistGitHubToken({
    workspaceId: workspaceIdValue,
    accessToken: config.accessToken,
    login: user.login,
    profileUrl: user.html_url,
  });
  await updateSourceStatus({
    sourceId: "github",
    status: "connected",
    workspaceId: workspaceIdValue,
  });

  return {
    login: user.login,
    syncedItems,
    repos: repos.length,
  };
}

export async function disconnectGitHub(workspaceId?: string) {
  const workspaceIdValue = getWorkspaceId(workspaceId);
  await deleteSourceConnectionConfig("github", workspaceIdValue);
  await updateSourceStatus({
    sourceId: "github",
    status: "disconnected",
    workspaceId: workspaceIdValue,
  });
}
