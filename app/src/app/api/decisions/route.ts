import { NextResponse } from "next/server";
import { getDecisionItems } from "@/lib/sync-repository";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") ?? undefined;
    const query = searchParams.get("query") ?? undefined;
    const decisions = await getDecisionItems(workspaceId, query);
    return NextResponse.json({ decisions });
  } catch (error) {
    console.error("Decisions route failed", error);
    return NextResponse.json({ error: "Unable to load decisions." }, { status: 500 });
  }
}
