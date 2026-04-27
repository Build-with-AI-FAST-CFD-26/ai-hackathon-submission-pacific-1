import { NextResponse } from "next/server";
import { ingestSlackEvent, ingestSlackMemberEvent, verifySlackRequestSignature } from "@/lib/slack";

export async function POST(request: Request) {
  const body = await request.text();

  if (!(await verifySlackRequestSignature(body, request.headers))) {
    return NextResponse.json({ error: "Invalid Slack signature." }, { status: 401 });
  }

  const payload = JSON.parse(body) as {
    type?: string;
    challenge?: string;
    team_id?: string;
    event_time?: number;
    event?: {
      type?: string;
      subtype?: string;
      hidden?: boolean;
      channel?: string;
      text?: string;
      ts?: string;
      event_ts?: string;
      user?:
        | string
        | {
            id: string;
            deleted?: boolean;
            is_bot?: boolean;
            name?: string;
            real_name?: string;
            updated?: number;
            profile?: {
              email?: string;
              display_name?: string;
              real_name?: string;
              title?: string;
            };
          };
    };
  };

  if (payload.type === "url_verification" && payload.challenge) {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (payload.type === "event_callback" && payload.team_id && payload.event?.type) {
    try {
      if (
        payload.event.type === "message" &&
        !payload.event.subtype &&
        !payload.event.hidden &&
        payload.event.channel &&
        payload.event.ts &&
        typeof payload.event.user === "string"
      ) {
        await ingestSlackEvent({
          teamId: payload.team_id,
          channelId: payload.event.channel,
          text: payload.event.text,
          ts: payload.event.ts,
          userId: payload.event.user,
        });
      }

      if (payload.event.type === "team_join" && payload.event.user && typeof payload.event.user !== "string") {
        await ingestSlackMemberEvent({
          teamId: payload.team_id,
          user: payload.event.user,
          eventTs:
            payload.event.event_ts ??
            (payload.event_time ? `${payload.event_time}.000000` : undefined),
          source: "team_join",
        });
      }

      if (payload.event.type === "user_change" && payload.event.user && typeof payload.event.user !== "string") {
        await ingestSlackMemberEvent({
          teamId: payload.team_id,
          user: payload.event.user,
          eventTs:
            payload.event.event_ts ??
            (payload.event_time ? `${payload.event_time}.000000` : undefined),
          source: "user_change",
        });
      }
    } catch (error) {
      console.error("Slack event ingest failed", error);
    }
  }

  return NextResponse.json({ ok: true });
}
