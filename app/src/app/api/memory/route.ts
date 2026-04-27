import { NextResponse } from "next/server";
import { refreshSlackWorkspaceIfStale } from "@/lib/slack";
import { getMemoryItems } from "@/lib/sync-repository";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") ?? undefined;
    const query = searchParams.get("query") ?? undefined;
    try {
      await refreshSlackWorkspaceIfStale({ workspaceId });
    } catch (error) {
      console.error("Slack auto-refresh failed before loading memory.", error);
    }
    const items = await getMemoryItems(workspaceId, query);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Memory route failed", error);
    return NextResponse.json({ error: "Unable to load memory feed." }, { status: 500 });
  }
}
