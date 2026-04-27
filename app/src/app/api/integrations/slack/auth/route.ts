import { NextResponse } from "next/server";
import { getSlackAuthUrl } from "@/lib/slack";

export async function GET(request: Request) {
  try {
    const { url, state, workspaceId } = await getSlackAuthUrl(request.url);
    const response = NextResponse.json({ url });
    response.cookies.set("sync_slack_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });
    response.cookies.set("sync_slack_workspace_id", workspaceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });
    return response;
  } catch (error) {
    console.error("Slack auth route failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start Slack OAuth." },
      { status: 500 },
    );
  }
}
