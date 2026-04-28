import { NextResponse } from "next/server";
import { syncGitHubWorkspace } from "@/lib/github";

export async function POST() {
  try {
    const result = await syncGitHubWorkspace();
    return NextResponse.json({ result });
  } catch (error) {
    console.error("GitHub sync route failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sync GitHub." },
      { status: 500 },
    );
  }
}
