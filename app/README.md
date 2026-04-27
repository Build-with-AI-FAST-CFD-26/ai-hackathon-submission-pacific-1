# Sync App

This is the Next.js application for Sync, an AI-powered second brain for startup teams.

## Stack
- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand
- Firebase client auth/storage
- MongoDB Atlas-ready server data layer
- Gemini-ready server integration with `@google/genai`

## What Was Added In This Backend Pass
- `src/app/api/chat/route.ts`
  Real server-side chat entry point
- `src/app/api/sources/route.ts`
  Source listing and custom source creation
- `src/app/api/sources/[sourceId]/route.ts`
  Source connect/disconnect state updates
- `src/app/api/memory/route.ts`
  Memory feed API
- `src/app/api/decisions/route.ts`
  Decision log API
- `src/app/api/health/route.ts`
  Backend health/config visibility
- `src/lib/mongodb.ts`
  Shared MongoDB connection helper
- `src/lib/sync-repository.ts`
  Repository layer with seed data fallback
- `src/lib/rag.ts`
  Retrieval and Gemini-backed answer generation

## Run Locally
1. Install dependencies:
   `npm install --legacy-peer-deps`
2. Copy env template:
   `copy .env.example .env.local`
3. Start dev server:
   `npm run dev`
4. Build for production:
   `npm run build`

## Environment Template
See [`.env.example`](D:/Coding/ai-hackathon-submission-pacific-1/app/.env.example).

## Current Backend Behavior
- If `MONGODB_URI` is missing, the app uses seeded demo records server-side.
- If Gemini credentials are missing, `/api/chat` still works with a grounded fallback answer generator.
- If Gemini credentials are present, the chat route uses `@google/genai`.
- If `GOOGLE_GENAI_USE_VERTEX=true`, the app is ready to call Vertex AI instead of API-key mode.
- If Slack app credentials are present, the app can start a real Slack OAuth flow and ingest channels/messages into MongoDB.

## Important Notes
- The current source connectors are backend-managed but not yet OAuth-connected to real third-party services.
- Firebase config now supports environment-variable overrides while keeping the current demo defaults.
- Node.js 20+ is recommended because the Google Gen AI SDK requires it.
- Vertex AI on this codebase uses ADC plus `vertexai: true`, `project`, and `location` in the installed SDK shape.

## Recommended Next Steps
1. Add MongoDB Atlas credentials
2. Authenticate ADC locally or in Cloud Run for Vertex AI
3. Add the Slack app credentials so OAuth can complete
4. Expand Slack ingestion coverage
5. Implement Notion connector second
6. Implement Gmail connector third
