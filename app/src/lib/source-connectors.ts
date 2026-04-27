import type { SourcePlatform, SourceStatus } from "@/types/sync";

export interface ConnectorFieldDefinition {
  key: string;
  label: string;
  placeholder: string;
  help: string;
  secret?: boolean;
}

export interface ConnectorDefinition {
  title: string;
  instructions: string;
  confirmLabel: string;
  statusOnSave: SourceStatus;
  fields: ConnectorFieldDefinition[];
}

export const connectorDefinitions: Record<SourcePlatform, ConnectorDefinition> = {
  slack: {
    title: "Connect Slack",
    instructions:
      "Add your Slack app credentials so Sync can start the OAuth flow and ingest channels, threads, and commitments.",
    confirmLabel: "Continue to Slack",
    statusOnSave: "pending",
    fields: [
      {
        key: "clientId",
        label: "Client ID",
        placeholder: "1234567890.1234567890",
        help: "Find this in your Slack app's Basic Information page.",
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        placeholder: "Slack client secret",
        help: "Used for the OAuth exchange after the workspace approves access.",
        secret: true,
      },
      {
        key: "signingSecret",
        label: "Signing Secret",
        placeholder: "Slack signing secret",
        help: "Needed to verify incoming Slack event payloads securely.",
        secret: true,
      },
    ],
  },
  gmail: {
    title: "Connect Gmail",
    instructions:
      "Provide the Google Workspace app details Sync should use for mailbox access and Gmail push watches.",
    confirmLabel: "Save Gmail Setup",
    statusOnSave: "connected",
    fields: [
      {
        key: "projectId",
        label: "Google Cloud Project ID",
        placeholder: "sync-494610",
        help: "The GCP project that owns your Gmail API and Pub/Sub setup.",
      },
      {
        key: "oauthClientId",
        label: "OAuth Client ID",
        placeholder: "Google OAuth client ID",
        help: "Used when we add the Gmail OAuth install flow.",
      },
      {
        key: "oauthClientSecret",
        label: "OAuth Client Secret",
        placeholder: "Google OAuth client secret",
        help: "Stored for the future Gmail connector handshake.",
        secret: true,
      },
      {
        key: "pubsubTopic",
        label: "Pub/Sub Topic",
        placeholder: "projects/your-project/topics/gmail-sync",
        help: "Required for Gmail watch notifications on Google Cloud.",
      },
    ],
  },
  notion: {
    title: "Connect Notion",
    instructions:
      "Add the Notion integration details Sync should use for docs, specs, and decision logs.",
    confirmLabel: "Save Notion Setup",
    statusOnSave: "connected",
    fields: [
      {
        key: "integrationSecret",
        label: "Internal Integration Secret",
        placeholder: "secret_xxx",
        help: "Create an internal integration in Notion and paste the secret here.",
        secret: true,
      },
      {
        key: "workspaceRoot",
        label: "Root Page or Database ID",
        placeholder: "Notion page/database ID",
        help: "The entry point Sync should monitor first.",
      },
      {
        key: "webhookSecret",
        label: "Webhook Secret",
        placeholder: "Notion webhook secret",
        help: "Lets Sync verify Notion change events when webhooks are enabled.",
        secret: true,
      },
    ],
  },
  github: {
    title: "Connect GitHub",
    instructions:
      "Provide the GitHub app values Sync will use to monitor repos, pull requests, issues, and releases.",
    confirmLabel: "Save GitHub Setup",
    statusOnSave: "connected",
    fields: [
      {
        key: "appId",
        label: "GitHub App ID",
        placeholder: "123456",
        help: "Create a GitHub App if you want webhook-first ingestion.",
      },
      {
        key: "clientId",
        label: "Client ID",
        placeholder: "GitHub client ID",
        help: "Used when the app later adds GitHub OAuth install support.",
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        placeholder: "GitHub client secret",
        help: "Stored for future GitHub OAuth and webhook flows.",
        secret: true,
      },
      {
        key: "webhookSecret",
        label: "Webhook Secret",
        placeholder: "GitHub webhook secret",
        help: "Needed to verify webhook deliveries securely.",
        secret: true,
      },
    ],
  },
  whatsapp: {
    title: "Prepare WhatsApp",
    instructions:
      "This connector is still a later-phase integration, but we can collect the Meta setup values now so the backend is ready.",
    confirmLabel: "Save WhatsApp Setup",
    statusOnSave: "pending",
    fields: [
      {
        key: "businessAccountId",
        label: "Business Account ID",
        placeholder: "Meta business account ID",
        help: "Found in your Meta app or WhatsApp Business Platform settings.",
      },
      {
        key: "phoneNumberId",
        label: "Phone Number ID",
        placeholder: "WhatsApp phone number ID",
        help: "Used when sending and receiving WhatsApp Cloud API messages.",
      },
      {
        key: "permanentToken",
        label: "Permanent Access Token",
        placeholder: "WhatsApp permanent token",
        help: "Stored for the eventual Cloud API integration.",
        secret: true,
      },
      {
        key: "verifyToken",
        label: "Webhook Verify Token",
        placeholder: "Webhook verify token",
        help: "Meta uses this to validate your webhook endpoint.",
        secret: true,
      },
    ],
  },
  custom: {
    title: "Add Custom Source",
    instructions:
      "Track a custom data source so we can wire a dedicated connector for it later.",
    confirmLabel: "Save Custom Source",
    statusOnSave: "pending",
    fields: [
      {
        key: "identifier",
        label: "Source URL or Identifier",
        placeholder: "https://...",
        help: "A URL, repo name, or internal handle for the system you want connected.",
      },
    ],
  },
};

export function getConnectorDefinition(platform: SourcePlatform) {
  return connectorDefinitions[platform];
}
