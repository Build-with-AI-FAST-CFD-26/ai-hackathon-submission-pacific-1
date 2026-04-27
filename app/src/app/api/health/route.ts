import { NextResponse } from "next/server";
import { hasGeminiConfig, hasMongoConfig, hasSlackOAuthConfig, serverEnv } from "@/lib/env";
import { getDecisionItems, getMemoryItems, getSources } from "@/lib/sync-repository";

export async function GET() {
  try {
    const [sources, memory, decisions] = await Promise.all([
      getSources(),
      getMemoryItems(),
      getDecisionItems(),
    ]);

    return NextResponse.json({
      ok: true,
      backend: {
        workspaceId: serverEnv.SYNC_DEFAULT_WORKSPACE_ID,
        usingMongo: hasMongoConfig,
        usingGemini: hasGeminiConfig,
        usingVertexAI: serverEnv.GOOGLE_GENAI_USE_VERTEX,
        slackOAuthConfigured: hasSlackOAuthConfig,
      },
      counts: {
        sources: sources.length,
        memory: memory.length,
        decisions: decisions.length,
      },
    });
  } catch (error) {
    console.error("Health route failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
