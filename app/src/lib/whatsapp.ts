import {
  deleteSourceConnectionConfig,
  getSourceConnectionConfig,
  updateSourceStatus,
  upsertKnowledgeDocument,
  upsertMemoryItem,
} from "@/lib/sync-repository";
import { serverEnv } from "@/lib/env";
import type { KnowledgeDocument, MemoryItem } from "@/types/sync";

const WHATSAPP_GRAPH_VERSION = "v22.0";

interface WhatsAppPhoneProfile {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  name_status?: string;
  quality_rating?: string;
}

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{
          profile?: {
            name?: string;
          };
          wa_id?: string;
        }>;
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: {
            body?: string;
          };
        }>;
      };
    }>;
  }>;
}

function getWorkspaceId(workspaceId?: string) {
  return workspaceId ?? serverEnv.SYNC_DEFAULT_WORKSPACE_ID;
}

async function getWhatsAppConfig(workspaceId?: string) {
  const config = await getSourceConnectionConfig("whatsapp", workspaceId);
  return config?.values ?? {};
}

async function whatsappApiRequest<T>(token: string, path: string) {
  const response = await fetch(`https://graph.facebook.com/${WHATSAPP_GRAPH_VERSION}/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp API failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as T;
}

export async function syncWhatsAppWorkspace(workspaceId?: string) {
  const workspaceIdValue = getWorkspaceId(workspaceId);
  const config = await getWhatsAppConfig(workspaceIdValue);
  if (!config.phoneNumberId || !config.permanentToken) {
    throw new Error("WhatsApp phone number ID or permanent token is missing.");
  }

  const profile = await whatsappApiRequest<WhatsAppPhoneProfile>(
    config.permanentToken,
    `${config.phoneNumberId}?fields=display_phone_number,verified_name,name_status,quality_rating`,
  );

  const createdAt = new Date().toISOString();
  const documentId = `whatsapp-profile-${config.phoneNumberId}`;
  const content = [
    `WhatsApp business number: ${profile.display_phone_number ?? config.phoneNumberId}.`,
    profile.verified_name ? `Verified name: ${profile.verified_name}.` : null,
    profile.name_status ? `Name status: ${profile.name_status}.` : null,
    profile.quality_rating ? `Quality rating: ${profile.quality_rating}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const document: KnowledgeDocument = {
    id: documentId,
    workspaceId: workspaceIdValue,
    platform: "whatsapp",
    title: `WhatsApp line: ${profile.display_phone_number ?? config.phoneNumberId}`,
    sourceLabel: "WhatsApp / Business profile",
    author: "WhatsApp Cloud API",
    content,
    excerpt: content,
    tags: ["WhatsApp", "Business Profile"],
    createdAt,
    updatedAt: createdAt,
  };

  const memoryItem: MemoryItem = {
    id: `memory-${documentId}`,
    workspaceId: workspaceIdValue,
    documentId,
    platform: "whatsapp",
    title: `WhatsApp line: ${profile.display_phone_number ?? config.phoneNumberId}`,
    sourceLabel: "WhatsApp / Business profile",
    author: "WhatsApp Cloud API",
    createdAt,
    content,
    tags: ["WhatsApp", "Business Profile"],
  };

  await upsertKnowledgeDocument(document);
  await upsertMemoryItem(memoryItem);
  await updateSourceStatus({
    sourceId: "whatsapp",
    status: "connected",
    workspaceId: workspaceIdValue,
  });

  return {
    displayPhoneNumber: profile.display_phone_number ?? config.phoneNumberId,
    verifiedName: profile.verified_name ?? null,
  };
}

export async function ingestWhatsAppWebhook(payload: WhatsAppWebhookPayload, workspaceId?: string) {
  const workspaceIdValue = getWorkspaceId(workspaceId);

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const contacts = change.value?.contacts ?? [];
      const contactMap = new Map(
        contacts.map((contact) => [contact.wa_id ?? "", contact.profile?.name ?? contact.wa_id ?? "WhatsApp contact"]),
      );

      for (const message of change.value?.messages ?? []) {
        if (!message.id || message.type !== "text" || !message.text?.body) {
          continue;
        }

        const author = contactMap.get(message.from ?? "") ?? message.from ?? "WhatsApp contact";
        const createdAt = message.timestamp
          ? new Date(Number(message.timestamp) * 1000).toISOString()
          : new Date().toISOString();
        const documentId = `whatsapp-${message.id}`;
        const excerpt = message.text.body.length > 220
          ? `${message.text.body.slice(0, 217)}...`
          : message.text.body;

        const document: KnowledgeDocument = {
          id: documentId,
          workspaceId: workspaceIdValue,
          platform: "whatsapp",
          title: `WhatsApp message: ${excerpt}`,
          sourceLabel: "WhatsApp / Messages",
          author,
          content: message.text.body,
          excerpt,
          tags: ["WhatsApp", "Message"],
          createdAt,
          updatedAt: createdAt,
        };

        const memoryItem: MemoryItem = {
          id: `memory-${documentId}`,
          workspaceId: workspaceIdValue,
          documentId,
          platform: "whatsapp",
          title: author,
          sourceLabel: "WhatsApp / Messages",
          author,
          createdAt,
          content: excerpt,
          tags: ["WhatsApp", "Message"],
        };

        await upsertKnowledgeDocument(document);
        await upsertMemoryItem(memoryItem);
      }
    }
  }

  await updateSourceStatus({
    sourceId: "whatsapp",
    status: "connected",
    workspaceId: workspaceIdValue,
  });
}

export async function verifyWhatsAppWebhookToken(verifyToken: string) {
  const config = await getWhatsAppConfig();
  return config.verifyToken === verifyToken;
}

export async function disconnectWhatsApp(workspaceId?: string) {
  const workspaceIdValue = getWorkspaceId(workspaceId);
  await deleteSourceConnectionConfig("whatsapp", workspaceIdValue);
  await updateSourceStatus({
    sourceId: "whatsapp",
    status: "disconnected",
    workspaceId: workspaceIdValue,
  });
}
