import { NextResponse } from "next/server";
import { getStoredSlackInstallation, uninstallSlack } from "@/lib/slack";

export async function GET() {
  try {
    const installation = await getStoredSlackInstallation();
    return NextResponse.json({ installation });
  } catch (error) {
    console.error("Slack install fetch route failed", error);
    return NextResponse.json({ error: "Unable to load Slack installation." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await uninstallSlack();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Slack uninstall route failed", error);
    return NextResponse.json({ error: "Unable to disconnect Slack." }, { status: 500 });
  }
}
