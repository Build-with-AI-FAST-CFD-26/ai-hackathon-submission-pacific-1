import { NextResponse } from "next/server";
import { getGmailAuthUrl } from "@/lib/gmail";

export async function GET(request: Request) {
  try {
    const { url, state, workspaceId } = await getGmailAuthUrl(request.url);
    const response = NextResponse.json({ url });
    response.cookies.set("sync_gmail_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });
    response.cookies.set("sync_gmail_workspace_id", workspaceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });
    return response;
  } catch (error) {
    console.error("Gmail auth route failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start Gmail OAuth." },
      { status: 500 },
    );
  }
}
