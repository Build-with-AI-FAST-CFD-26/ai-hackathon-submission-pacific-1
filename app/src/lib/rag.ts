import { GoogleGenAI } from "@google/genai";
import { formatCitationDate } from "@/lib/format";
import { hasGeminiConfig, serverEnv } from "@/lib/env";
import { getKnowledgeDocuments } from "@/lib/sync-repository";
import { refreshSlackWorkspaceIfStale } from "@/lib/slack";
import type { Citation, KnowledgeDocument } from "@/types/sync";

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "what",
  "when",
  "why",
  "with",
  "you",
  "your",
]);

let cachedClient: GoogleGenAI | null = null;

function clearBrokenLoopbackProxyEnv() {
  const proxyKeys = [
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy",
  ] as const;

  for (const key of proxyKeys) {
    const value = process.env[key];
    if (value?.includes("127.0.0.1:9") || value?.includes("localhost:9")) {
      delete process.env[key];
    }
  }
}

function getGenAIClient() {
  if (cachedClient) {
    return cachedClient;
  }

  if (serverEnv.GOOGLE_GENAI_USE_VERTEX) {
    clearBrokenLoopbackProxyEnv();
  }

  cachedClient = serverEnv.GOOGLE_GENAI_USE_VERTEX
    ? new GoogleGenAI({
        vertexai: true,
        project: serverEnv.GOOGLE_CLOUD_PROJECT,
        location: serverEnv.GOOGLE_CLOUD_LOCATION,
      })
    : new GoogleGenAI({
        apiKey: serverEnv.GOOGLE_GENAI_API_KEY,
      });

  return cachedClient;
}

function tokenize(input: string) {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

function scoreDocument(question: string, document: KnowledgeDocument) {
  const tokens = tokenize(question);
  const content = `${document.title} ${document.excerpt} ${document.content} ${document.tags.join(" ")}`.toLowerCase();

  let score = 0;

  for (const token of tokens) {
    if (document.title.toLowerCase().includes(token)) {
      score += 5;
    }
    if (document.tags.some((tag) => tag.toLowerCase().includes(token))) {
      score += 4;
    }
    if (content.includes(token)) {
      score += 2;
    }
  }

  if (question.toLowerCase().includes(document.platform)) {
    score += 1;
  }

  return score;
}

function buildCitations(documents: KnowledgeDocument[]): Citation[] {
  return documents.map((document) => ({
    documentId: document.id,
    title: document.title,
    platform: document.platform,
    snippet: document.excerpt,
    date: formatCitationDate(document.createdAt),
    url: document.url,
  }));
}

function buildFallbackAnswer(question: string, documents: KnowledgeDocument[]) {
  if (documents.length === 0) {
    return `I don't have indexed workspace records that answer "${question}" yet.\n\nConnect Slack, Gmail, Notion, or GitHub so I can ground answers in real team context.`;
  }

  const topDocuments = documents.slice(0, 3);
  const evidence = topDocuments
    .map(
      (document, index) =>
        `- [${index + 1}] **${document.title}** from ${document.sourceLabel}: ${document.excerpt}`,
    )
    .join("\n");

  return `I searched the indexed workspace memory and found the strongest evidence below.\n\n${evidence}\n\nBased on these records, the current answer is: ${topDocuments[0].excerpt}`;
}

async function generateWithGemini(question: string, documents: KnowledgeDocument[]) {
  const ai = getGenAIClient();
  const context = documents
    .map(
      (document, index) =>
        `[${index + 1}]
Title: ${document.title}
Platform: ${document.platform}
Source: ${document.sourceLabel}
Author: ${document.author}
Created: ${document.createdAt}
Tags: ${document.tags.join(", ")}
Excerpt: ${document.excerpt}
Content: ${document.content}`,
    )
    .join("\n\n");

  const prompt = `You are Sync, an AI second brain for a startup team.

Answer the user's question using only the provided workspace context.
- Use concise markdown.
- Cite every non-trivial claim with bracket citations like [1] or [1][2].
- If the context is incomplete, say what is missing instead of guessing.

User question:
${question}

Workspace context:
${context}`;

  const response = await ai.models.generateContent({
    model: serverEnv.GOOGLE_GENAI_MODEL,
    contents: prompt,
  });

  return response.text?.trim() || "";
}

export async function answerWorkspaceQuestion(question: string, workspaceId?: string) {
  try {
    await refreshSlackWorkspaceIfStale({ workspaceId });
  } catch (error) {
    console.error("Slack auto-refresh failed before answering chat.", error);
  }

  const documents = await getKnowledgeDocuments(workspaceId);
  const prefersRosterContext = /\b(member|members|joined|join|team|roster|workspace users?)\b/i.test(
    question,
  );
  const ranked = documents
    .map((document) => ({
      document,
      score: scoreDocument(question, document),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.document.createdAt.localeCompare(left.document.createdAt);
    });

  const selectedDocuments = ranked
    .filter((item) => item.score > 0)
    .slice(0, prefersRosterContext ? 8 : 4)
    .map((item) => item.document);
  const citations = buildCitations(selectedDocuments);

  let content = buildFallbackAnswer(question, selectedDocuments);

  if (selectedDocuments.length > 0 && hasGeminiConfig) {
    try {
      const generated = await generateWithGemini(question, selectedDocuments);
      if (generated) {
        content = generated;
      }
    } catch (error) {
      console.error("Gemini generation failed, using fallback answer.", error);
    }
  }

  return {
    message: {
      id: Date.now().toString(),
      role: "assistant" as const,
      content,
      sources: citations,
    },
  };
}
