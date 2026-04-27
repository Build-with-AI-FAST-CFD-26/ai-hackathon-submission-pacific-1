# Sync - AI Second Brain for Startup Teams

Sync is a searchable team memory layer for fast-moving startups. It connects the tools teams already use, preserves decisions and commitments, and lets users ask natural-language questions like "Why did we choose Vertex AI?" and get grounded answers with citations.

## Current Status
- Frontend: Next.js dashboard with chat, sources, memory, and decisions views
- Backend foundation: live Next.js API routes for chat, sources, memory, decisions, and health
- AI layer: Gemini-ready server integration with safe fallback answers when credentials are missing
- Data layer: MongoDB Atlas-ready repository layer with seeded demo records for local development
- Deployment target: Google Cloud friendly, with a simple path to Cloud Run

## Monorepo Layout
- Root: project overview and hackathon-facing documentation
- [`app`](D:/Coding/ai-hackathon-submission-pacific-1/app): Next.js application

## Features In Progress
- Real RAG chat route at `/api/chat`
- Source management route at `/api/sources`
- Memory feed route at `/api/memory`
- Decision log route at `/api/decisions`
- Health check route at `/api/health`

The connector UX is now backed by the server, but the actual OAuth, webhook, and ingestion flows for Slack, Notion, Gmail, and GitHub are still the next phase.

## Local Setup
1. Install Node.js 20 or newer.
2. Change into the app directory:
   `cd app`
3. Install dependencies:
   `npm install --legacy-peer-deps`
4. Copy the env template:
   `copy .env.example .env.local`
5. Start the app:
   `npm run dev`
6. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables
The app supports running in three modes:

1. Demo mode
   No MongoDB or Gemini credentials required. The app serves seeded workspace data and deterministic backend responses.
2. Gemini API mode
   Add `GOOGLE_GENAI_API_KEY` and keep `GOOGLE_GENAI_USE_VERTEX=false`.
3. Vertex AI mode
   Use ADC with `gcloud auth application-default login`, then set `GOOGLE_GENAI_USE_VERTEX=true` and provide `GOOGLE_CLOUD_PROJECT` plus `GOOGLE_CLOUD_LOCATION`.

MongoDB Atlas is optional for local testing but recommended for persistent state:
- `MONGODB_URI`
- `MONGODB_DB_NAME`

Slack requires its own app credentials before the first real OAuth install:
- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_SIGNING_SECRET`
- optional `APP_BASE_URL` or `SLACK_REDIRECT_URI`

## Google Cloud Deployment Plan
For your $5 credit constraint, the safest first deployment is:

1. Deploy the Next.js app to Cloud Run with `min-instances=0`
2. Use MongoDB Atlas free tier for database storage
3. Use Vertex AI through ADC once the service account or local ADC auth is in place
4. Keep Slack ingestion limited to a small channel/message window until the demo stabilizes

This keeps the architecture hackathon-friendly while staying compatible with a more production-style Google Cloud setup later.

## Next Backend Milestones
1. Finish Slack live install by adding the Slack app credentials
2. Add richer Slack event ingestion and channel/thread pagination
3. Implement Notion OAuth + webhook sync
4. Implement Gmail OAuth + Pub/Sub watch renewal
5. Implement GitHub OAuth + webhook ingestion
6. Add decision and commitment extraction jobs

## App Docs
The implementation-specific setup and backend notes live in [`app/README.md`](D:/Coding/ai-hackathon-submission-pacific-1/app/README.md).
