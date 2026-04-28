import { NextResponse } from "next/server";
import { ingestWhatsAppWebhook, verifyWhatsAppWebhookToken } from "@/lib/whatsapp";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const mode = requestUrl.searchParams.get("hub.mode");
  const verifyToken = requestUrl.searchParams.get("hub.verify_token");
  const challenge = requestUrl.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !verifyToken || !challenge) {
    return NextResponse.json({ error: "Invalid WhatsApp webhook verification request." }, { status: 400 });
  }

  if (!(await verifyWhatsAppWebhookToken(verifyToken))) {
    return NextResponse.json({ error: "Invalid verify token." }, { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    await ingestWhatsAppWebhook(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp webhook ingest failed", error);
    return NextResponse.json({ error: "Unable to ingest WhatsApp webhook." }, { status: 500 });
  }
}
