import { NextResponse } from "next/server";
import { syncSlackWorkspaceInstallation } from "@/lib/slack";

export async function POST() {
  try {
    const result = await syncSlackWorkspaceInstallation();
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Slack sync route failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sync Slack." },
      { status: 500 },
    );
  }
}
