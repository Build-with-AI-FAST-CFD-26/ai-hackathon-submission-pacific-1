import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  MONGODB_URI: optionalString,
  MONGODB_DB_NAME: z.string().min(1).default("sync"),
  GOOGLE_GENAI_API_KEY: optionalString,
  GEMINI_API_KEY: optionalString,
  GOOGLE_GENAI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GOOGLE_GENAI_USE_VERTEX: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  GOOGLE_GENAI_USE_VERTEXAI: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  GOOGLE_CLOUD_PROJECT: optionalString,
  GOOGLE_CLOUD_LOCATION: optionalString,
  SYNC_DEFAULT_WORKSPACE_ID: z.string().min(1).default("primary-workspace"),
  APP_BASE_URL: optionalString,
  SLACK_CLIENT_ID: optionalString,
  SLACK_CLIENT_SECRET: optionalString,
  SLACK_SIGNING_SECRET: optionalString,
  SLACK_REDIRECT_URI: optionalString,
  SLACK_SCOPES: optionalString,
  SLACK_SYNC_CHANNEL_LIMIT: z.coerce.number().int().positive().default(10),
  SLACK_SYNC_MESSAGE_LIMIT: z.coerce.number().int().positive().default(50),
  SLACK_AUTO_SYNC_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(120),
  JWT_SECRET: optionalString,
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid server environment configuration: ${parsedEnv.error.message}`);
}

const data = parsedEnv.data;

export const serverEnv = {
  MONGODB_URI: data.MONGODB_URI,
  MONGODB_DB_NAME: data.MONGODB_DB_NAME,
  GOOGLE_GENAI_API_KEY: data.GOOGLE_GENAI_API_KEY ?? data.GEMINI_API_KEY,
  GOOGLE_GENAI_MODEL: data.GOOGLE_GENAI_MODEL,
  GOOGLE_GENAI_USE_VERTEX: data.GOOGLE_GENAI_USE_VERTEX ?? data.GOOGLE_GENAI_USE_VERTEXAI ?? false,
  GOOGLE_CLOUD_PROJECT: data.GOOGLE_CLOUD_PROJECT,
  GOOGLE_CLOUD_LOCATION: data.GOOGLE_CLOUD_LOCATION,
  SYNC_DEFAULT_WORKSPACE_ID: data.SYNC_DEFAULT_WORKSPACE_ID,
  APP_BASE_URL: data.APP_BASE_URL,
  SLACK_CLIENT_ID: data.SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET: data.SLACK_CLIENT_SECRET,
  SLACK_SIGNING_SECRET: data.SLACK_SIGNING_SECRET,
  SLACK_REDIRECT_URI: data.SLACK_REDIRECT_URI,
  SLACK_SCOPES:
    data.SLACK_SCOPES ??
    "channels:history,channels:read,channels:join,groups:history,groups:read,im:history,im:read,mpim:history,mpim:read,team:read,users:read",
  SLACK_SYNC_CHANNEL_LIMIT: data.SLACK_SYNC_CHANNEL_LIMIT,
  SLACK_SYNC_MESSAGE_LIMIT: data.SLACK_SYNC_MESSAGE_LIMIT,
  SLACK_AUTO_SYNC_MAX_AGE_SECONDS: data.SLACK_AUTO_SYNC_MAX_AGE_SECONDS,
  JWT_SECRET: data.JWT_SECRET,
};

export const hasMongoConfig = Boolean(serverEnv.MONGODB_URI);

export const hasGeminiConfig = serverEnv.GOOGLE_GENAI_USE_VERTEX
  ? Boolean(serverEnv.GOOGLE_CLOUD_PROJECT && serverEnv.GOOGLE_CLOUD_LOCATION)
  : Boolean(serverEnv.GOOGLE_GENAI_API_KEY);

export const hasSlackOAuthConfig = Boolean(
  serverEnv.SLACK_CLIENT_ID && serverEnv.SLACK_CLIENT_SECRET,
);

export const hasJwtConfig = Boolean(serverEnv.JWT_SECRET);
