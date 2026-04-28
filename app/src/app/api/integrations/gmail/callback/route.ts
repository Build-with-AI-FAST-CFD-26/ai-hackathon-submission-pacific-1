import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeGmailCode, syncGmailWorkspace } from "@/lib/gmail";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("sync_gmail_oauth_state")?.value;
  const workspaceId = cookieStore.get("sync_gmail_workspace_id")?.value;

  const clearCookies = (response: NextResponse) => {
    response.cookies.delete("sync_gmail_oauth_state");
    response.cookies.delete("sync_gmail_workspace_id");
    return response;
  };

  if (error) {
    return clearCookies(
      NextResponse.redirect(new URL(`/sources?gmail=${encodeURIComponent(error)}`, requestUrl.origin)),
    );
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return clearCookies(
      NextResponse.redirect(new URL("/sources?gmail=invalid_state", requestUrl.origin)),
    );
  }

  try {
    await exchangeGmailCode({
      code,
      requestUrl: request.url,
      workspaceId,
    });

    try {
      await syncGmailWorkspace(workspaceId);
    } catch (syncError) {
      console.error("Gmail sync after install failed", syncError);
      return clearCookies(
        NextResponse.redirect(new URL("/sources?gmail=connected_with_sync_warning", requestUrl.origin)),
      );
    }

    return clearCookies(NextResponse.redirect(new URL("/sources?gmail=connected", requestUrl.origin)));
  } catch (routeError) {
    console.error("Gmail callback route failed", routeError);
    return clearCookies(
      NextResponse.redirect(new URL("/sources?gmail=failed", requestUrl.origin)),
    );
  }
}
