import { NextResponse } from "next/server";
import { disconnectGitHub } from "@/lib/github";
import { getSourceConnectionConfig } from "@/lib/sync-repository";

export async function GET() {
  try {
    const config = await getSourceConnectionConfig("github");
    return NextResponse.json({
      installation: config
        ? {
            login: config.values.login ?? null,
            profileUrl: config.values.profileUrl ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("GitHub install fetch route failed", error);
    return NextResponse.json({ error: "Unable to load GitHub installation." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await disconnectGitHub();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("GitHub disconnect route failed", error);
    return NextResponse.json({ error: "Unable to disconnect GitHub." }, { status: 500 });
  }
}
