import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeSlackCodeForInstallation, syncSlackWorkspaceInstallation } from "@/lib/slack";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("sync_slack_oauth_state")?.value;
  const workspaceId = cookieStore.get("sync_slack_workspace_id")?.value;

  const clearCookies = (response: NextResponse) => {
    response.cookies.delete("sync_slack_oauth_state");
    response.cookies.delete("sync_slack_workspace_id");
    return response;
  };

  if (error) {
    return clearCookies(
      NextResponse.redirect(new URL(`/sources?slack=${encodeURIComponent(error)}`, requestUrl.origin)),
    );
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return clearCookies(
      NextResponse.redirect(new URL("/sources?slack=invalid_state", requestUrl.origin)),
    );
  }

  try {
    await exchangeSlackCodeForInstallation({
      code,
      requestUrl: request.url,
      workspaceId,
    });

    try {
      await syncSlackWorkspaceInstallation(workspaceId);
    } catch (syncError) {
      console.error("Slack sync after install failed", syncError);
      return clearCookies(
        NextResponse.redirect(new URL("/sources?slack=connected_with_sync_warning", requestUrl.origin)),
      );
    }

    return clearCookies(NextResponse.redirect(new URL("/sources?slack=connected", requestUrl.origin)));
  } catch (routeError) {
    console.error("Slack callback route failed", routeError);
    return clearCookies(
      NextResponse.redirect(new URL("/sources?slack=failed", requestUrl.origin)),
    );
  }
}
