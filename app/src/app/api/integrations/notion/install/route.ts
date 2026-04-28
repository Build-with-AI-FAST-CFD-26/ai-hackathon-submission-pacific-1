import { NextResponse } from "next/server";
import { disconnectNotion } from "@/lib/notion";
import { getSourceConnectionConfig } from "@/lib/sync-repository";

export async function GET() {
  try {
    const config = await getSourceConnectionConfig("notion");
    return NextResponse.json({
      installation: config
        ? {
            workspaceRoot: config.values.workspaceRoot ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("Notion install fetch route failed", error);
    return NextResponse.json({ error: "Unable to load Notion installation." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await disconnectNotion();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Notion disconnect route failed", error);
    return NextResponse.json({ error: "Unable to disconnect Notion." }, { status: 500 });
  }
}
