import { NextResponse } from "next/server";
import { syncWhatsAppWorkspace } from "@/lib/whatsapp";

export async function POST() {
  try {
    const result = await syncWhatsAppWorkspace();
    return NextResponse.json({ result });
  } catch (error) {
    console.error("WhatsApp sync route failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to validate WhatsApp." },
      { status: 500 },
    );
  }
}
