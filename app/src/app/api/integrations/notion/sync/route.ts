import { NextResponse } from "next/server";
import { syncNotionWorkspace } from "@/lib/notion";

export async function POST() {
  try {
    const result = await syncNotionWorkspace();
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Notion sync route failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sync Notion." },
      { status: 500 },
    );
  }
}
