import { NextResponse } from "next/server";
import { disconnectWhatsApp } from "@/lib/whatsapp";
import { getSourceConnectionConfig } from "@/lib/sync-repository";

export async function GET() {
  try {
    const config = await getSourceConnectionConfig("whatsapp");
    return NextResponse.json({
      installation: config
        ? {
            businessAccountId: config.values.businessAccountId ?? null,
            phoneNumberId: config.values.phoneNumberId ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("WhatsApp install fetch route failed", error);
    return NextResponse.json({ error: "Unable to load WhatsApp installation." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await disconnectWhatsApp();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp disconnect route failed", error);
    return NextResponse.json({ error: "Unable to disconnect WhatsApp." }, { status: 500 });
  }
}
