import { NextResponse } from "next/server";
import { syncGmailWorkspace } from "@/lib/gmail";

export async function POST() {
  try {
    const result = await syncGmailWorkspace();
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Gmail sync route failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sync Gmail." },
      { status: 500 },
    );
  }
}
