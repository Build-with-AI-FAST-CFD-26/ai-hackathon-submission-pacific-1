import { NextResponse } from "next/server";
import { disconnectGmail } from "@/lib/gmail";
import { getSourceConnectionConfig } from "@/lib/sync-repository";

export async function GET() {
  try {
    const config = await getSourceConnectionConfig("gmail");
    return NextResponse.json({
      installation: config
        ? {
            connectedEmail: config.values.connectedEmail ?? null,
            watchExpiration: config.values.watchExpiration ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("Gmail install fetch route failed", error);
    return NextResponse.json({ error: "Unable to load Gmail installation." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await disconnectGmail();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Gmail disconnect route failed", error);
    return NextResponse.json({ error: "Unable to disconnect Gmail." }, { status: 500 });
  }
}
