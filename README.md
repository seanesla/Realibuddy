# RealiBuddy

🏆 **Winner - "Best AI/ML" Award at HackCC Hackathon** 🏆

**Note:** This project was developed for the HackCC hackathon and is no longer under active development.

Real-time lie detection: monitors speech/text, fact-checks via AI web search, delivers Pavlok feedback on false claims.

**Status:** Fully functional. Uses beeps for testing (configurable to zaps).

## Features

- **Input:** Real-time voice (Deepgram STT, <300ms, 16kHz PCM) or text with source filtering
- **Fact-Checking:** Perplexity Sonar-Pro with web search, source filters (authoritative/news/social/academic), verdicts (true/false/unverifiable), confidence scores, citations
- **Feedback:** Pavlok (beep/vibe/zap), TTS announcements, color-coded UI cards
- **Tracking:** SQLite database, dashboard stats, history viewer, CSV/JSON export
- **Safety:** 10 events/hour max, 5s cooldown, emergency stop, intensity limits (10-80)

## Architecture

**Backend:** Node.js 20+, TypeScript, Express 5.0 (REST), ws 8.18 (WebSocket), SQLite (better-sqlite3)
**Frontend:** Vanilla JS, Tailwind CSS, Web Audio API, 3-tab UI
**Services:** Deepgram (STT/TTS), Perplexity AI (fact-check), Pavlok v5 (stimulus), SafetyManager (limits)

**Key Files:**
- `backend/src/server.ts` - Server entry
- `backend/src/websocket/handler.ts` - Message routing
- `backend/src/services/perplexity.ts` - Fact-checker
- `backend/src/services/safety.ts` - Safety constraints
- `backend/src/services/database.ts` - DB operations
- `frontend/js/{app,websocket,audio}.js` - UI/client

## How It Works

**Voice:** Mic → WebSocket (PCM16) → Deepgram transcription → 5s silence detection → Perplexity fact-check → SafetyManager → Pavlok feedback (if false) → TTS verdict → UI display

**Text:** Input → WebSocket → Perplexity fact-check → Pavlok feedback (if false) → TTS → UI (ephemeral, no DB)

## Setup

**Prerequisites:** Node.js 20+, Pavlok device, API keys (Deepgram, Perplexity, Pavlok)

**Steps:**
1. Get API keys: Deepgram (deepgram.com), Perplexity (perplexity.ai), Pavlok (`node get-pavlok-token.js`)
2. Copy `.env.example` → `.env`, add: `DEEPGRAM_API_KEY`, `PERPLEXITY_API_KEY`, `PAVLOK_API_TOKEN`, `PORT=3001`
3. Install: `cd backend && npm install`
4. Run: `npm run dev` (backend), `npx serve frontend -p 8080` (frontend)
5. Access: http://localhost:8080

**Enable Zaps:** Edit `backend/src/websocket/handler.ts` line ~160: `sendBeep(255, ...)` → `sendZap(intensity, ...)`

## API

**REST:**
- GET `/health`, `/api/history/sessions`, `/api/history/sessions/:id`, `/api/history/stats`, `/api/history/export?format=csv|json`
- DELETE `/api/history/sessions/:id`

**WebSocket (Client → Server):** `start_monitoring`, `stop_monitoring`, `text_input`, `emergency_stop`, binary audio

**WebSocket (Server → Client):** `transcript_interim/final`, `fact_check_started/result`, `zap_delivered`, `safety_status`, `error/success`, binary audio (TTS)

**DB Tables:** `sessions` (id, times, stats), `fact_checks` (id, session_id, transcript, verdict, confidence, evidence), `zap_history`, `safety_state`

## Usage

**Voice:** Start Monitoring → grant mic → speak (5s pause = statement) → view color results (green/red/yellow) → Stop
**Text:** Enter text → select source filter → Check Claim → view result
**Dashboard:** Overall stats, truth rate, verdict distribution
**History:** Browse sessions, export CSV/JSON
**Settings:** Intensity (10-80), WebSocket URL, auto-reconnect

## Safety & Limitations

**Safety:** 10/hour limit, 5s cooldown, emergency stop, default beep mode
**Medical (Zap Mode):** DO NOT use with pacemakers, heart conditions, epilepsy, pregnancy, implants. Not for <18, anxiety disorders.
**AI Limits:** False positives/negatives possible, misses sarcasm/context, recent events may fail, opinion/fact distinction imperfect
**Requirements:** Internet, modern browser (Chrome/Edge), mic for voice

## Development

**Scripts:** `npm run dev`, `npm run build`, `npm test`, `npm run typecheck`
**Dependencies:** Backend (@deepgram/sdk, @perplexity-ai/perplexity_ai, better-sqlite3, express, ws), Root (@api/pavlok)

## Troubleshooting

**WebSocket failed:** Check backend on 3001, verify URL, check firewall
**Mic:** Grant permissions, verify not in use, try Chrome/Edge
**Timeouts:** Verify Perplexity key, check internet (30s timeout)
**No feedback:** Verify Pavlok token valid, device on, limits not exceeded, refresh token
**DB errors:** Check permissions, delete `realibuddy.db` to reset

## Privacy & Legal

**Privacy:** Audio via Deepgram API (not stored), transcripts in local SQLite
**Legal:** Get consent before recording, check local laws (all-party consent often required), Pavlok at own risk, not medical device
**Use:** Self-monitoring primarily, inform others when active, no surveillance

## Credits & Disclaimer

Experimental project using Deepgram (STT/TTS), Perplexity AI (fact-check), Pavlok (feedback). No warranties on accuracy or safety. Consult doctor before using zap mode. Use at your own risk.
