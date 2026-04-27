import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";

export const SESSION_COOKIE_NAME = "sync_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export interface SyncSession {
  sub: string;
  email: string;
  name?: string;
  photoURL?: string;
  provider?: string;
  iat: number;
  exp: number;
}

function toBase64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64Url<T>(input: string) {
  return JSON.parse(Buffer.from(input, "base64url").toString("utf8")) as T;
}

function getJwtSecret() {
  if (!serverEnv.JWT_SECRET) {
    throw new Error("JWT auth is not configured. Add JWT_SECRET to the server environment.");
  }

  return serverEnv.JWT_SECRET;
}

function signSegment(input: string) {
  return createHmac("sha256", getJwtSecret()).update(input).digest("base64url");
}

export function createSessionToken(session: Omit<SyncSession, "iat" | "exp">) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: SyncSession = {
    ...session,
    iat: issuedAt,
    exp: issuedAt + SESSION_DURATION_SECONDS,
  };

  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = toBase64Url(JSON.stringify(payload));
  const signature = signSegment(`${header}.${body}`);

  return `${header}.${body}.${signature}`;
}

export function verifySessionToken(token: string) {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    return null;
  }

  const expectedSignature = signSegment(`${header}.${payload}`);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  const parsedPayload = fromBase64Url<SyncSession>(payload);
  if (parsedPayload.exp * 1000 <= Date.now()) {
    return null;
  }

  return parsedPayload;
}

export async function getServerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export function getSessionCookieMaxAge() {
  return SESSION_DURATION_SECONDS;
}
