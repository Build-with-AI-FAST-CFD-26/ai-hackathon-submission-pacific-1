import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeGitHubCode, syncGitHubWorkspace } from "@/lib/github";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("sync_github_oauth_state")?.value;
  const workspaceId = cookieStore.get("sync_github_workspace_id")?.value;

  const clearCookies = (response: NextResponse) => {
    response.cookies.delete("sync_github_oauth_state");
    response.cookies.delete("sync_github_workspace_id");
    return response;
  };

  if (error) {
    return clearCookies(
      NextResponse.redirect(new URL(`/sources?github=${encodeURIComponent(error)}`, requestUrl.origin)),
    );
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return clearCookies(
      NextResponse.redirect(new URL("/sources?github=invalid_state", requestUrl.origin)),
    );
  }

  try {
    await exchangeGitHubCode({
      code,
      requestUrl: request.url,
      workspaceId,
    });

    try {
      await syncGitHubWorkspace(workspaceId);
    } catch (syncError) {
      console.error("GitHub sync after install failed", syncError);
      return clearCookies(
        NextResponse.redirect(new URL("/sources?github=connected_with_sync_warning", requestUrl.origin)),
      );
    }

    return clearCookies(
      NextResponse.redirect(new URL("/sources?github=connected", requestUrl.origin)),
    );
  } catch (routeError) {
    console.error("GitHub callback route failed", routeError);
    return clearCookies(
      NextResponse.redirect(new URL("/sources?github=failed", requestUrl.origin)),
    );
  }
}
