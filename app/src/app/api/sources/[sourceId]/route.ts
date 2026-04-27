import { NextResponse } from "next/server";
import { z } from "zod";
import { saveSourceConnectionConfig, updateSourceStatus } from "@/lib/sync-repository";
import type { SourcePlatform } from "@/types/sync";

const sourceUpdateSchema = z
  .object({
    status: z.enum(["connected", "disconnected", "pending"]).optional(),
    workspaceId: z.string().trim().optional(),
    platform: z.enum(["slack", "gmail", "notion", "github", "whatsapp", "custom"]).optional(),
    configuration: z.record(z.string(), z.string().trim().min(1)).optional(),
  })
  .refine(
    (value) => value.status !== undefined || value.configuration !== undefined,
    "Provide a status or connection configuration.",
  );

const sourcePlatformById: Record<string, SourcePlatform> = {
  slack: "slack",
  gmail: "gmail",
  notion: "notion",
  github: "github",
  whatsapp: "whatsapp",
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sourceId: string }> },
) {
  try {
    const { sourceId } = await context.params;
    const body = await request.json();
    const payload = sourceUpdateSchema.parse(body);

    if (payload.configuration) {
      const platform = payload.platform ?? sourcePlatformById[sourceId] ?? "custom";
      await saveSourceConnectionConfig({
        sourceId,
        platform,
        values: payload.configuration,
        workspaceId: payload.workspaceId,
        status: payload.status,
      });
    }

    const resolvedStatus = payload.status ?? "connected";

    const source = await updateSourceStatus({
      sourceId,
      status: resolvedStatus,
      workspaceId: payload.workspaceId,
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found." }, { status: 404 });
    }

    return NextResponse.json({ source });
  } catch (error) {
    console.error("Update source route failed", error);
    return NextResponse.json({ error: "Unable to update source." }, { status: 500 });
  }
}
