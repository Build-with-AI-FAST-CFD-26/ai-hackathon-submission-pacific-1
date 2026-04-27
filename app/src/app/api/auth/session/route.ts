import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  getServerSession,
  getSessionCookieMaxAge,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-session";
import { hasJwtConfig } from "@/lib/env";

const createSessionSchema = z.object({
  uid: z.string().trim().min(1, "A Firebase user ID is required."),
  email: z.string().trim().email("A valid email address is required."),
  name: z.string().trim().optional(),
  photoURL: z.string().trim().url().optional().or(z.literal("")),
  provider: z.string().trim().optional(),
});

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionCookieMaxAge(),
  };
}

export async function GET() {
  if (!hasJwtConfig) {
    return NextResponse.json({ session: null, configured: false });
  }

  const session = await getServerSession();
  return NextResponse.json({ session, configured: true });
}

export async function POST(request: Request) {
  if (!hasJwtConfig) {
    return NextResponse.json(
      { error: "JWT auth is not configured on the server." },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const payload = createSessionSchema.parse(body);

    const token = createSessionToken({
      sub: payload.uid,
      email: payload.email,
      name: payload.name?.trim() || undefined,
      photoURL: payload.photoURL || undefined,
      provider: payload.provider || "firebase",
    });

    const response = NextResponse.json({
      session: {
        sub: payload.uid,
        email: payload.email,
        name: payload.name?.trim() || undefined,
        photoURL: payload.photoURL || undefined,
        provider: payload.provider || "firebase",
      },
      configured: true,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("Create auth session route failed", error);
    return NextResponse.json({ error: "Unable to create auth session." }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
