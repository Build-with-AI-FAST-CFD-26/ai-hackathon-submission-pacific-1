import { NextResponse } from "next/server";
import { z } from "zod";
import { createCustomSource, getSources } from "@/lib/sync-repository";

const createSourceSchema = z.object({
  identifier: z.string().trim().min(1, "A source URL or identifier is required."),
  name: z.string().trim().optional(),
  workspaceId: z.string().trim().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") ?? undefined;
    const sources = await getSources(workspaceId);
    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Sources route failed", error);
    return NextResponse.json({ error: "Unable to load sources." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = createSourceSchema.parse(body);
    const source = await createCustomSource(payload);
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error("Create source route failed", error);
    return NextResponse.json({ error: "Unable to create source request." }, { status: 500 });
  }
}
