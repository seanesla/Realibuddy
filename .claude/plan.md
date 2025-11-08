# RealiBuddy Implementation Plan

## Todo List

- [x] Create project documentation and configuration
- [x] Add comprehensive API docs (Gemini, Deepgram, Pavlok)
- [x] Test Pavlok integration via Zapier MCP
- [x] Create .gitignore and initial commit
- [x] Build complete frontend application
- [x] Build backend server with WebSocket support
- [x] Implement Deepgram streaming integration
- [x] Implement Gemini fact-checking pipeline
- [x] Implement Pavlok API integration (direct API v5, not MCP)
- [ ] End-to-end testing <- IN PROGRESS
- [ ] Deployment

---

## Comprehensive Handoff Report

### Project Overview
**RealiBuddy** is a real-time lie detection system that monitors spoken statements, verifies facts using AI and web search, and delivers immediate behavioral feedback through Pavlok wearable device integration.

**Core Functionality:**
1. Browser captures microphone audio via WebRTC
2. Audio streams to backend via WebSocket
3. Backend forwards to Deepgram for speech-to-text (Nova-2 model, sub-300ms latency)
4. Transcripts sent to Gemini API for fact extraction and verification
5. False claims trigger Pavlok electric stimulus (intensity proportional to confidence)
6. Safety limits: 10 zaps/hour max, 5-second cooldown, emergency stop, SQLite persistence

### Technology Stack (CONFIRMED)
- **Backend**: Node.js 20.x LTS + TypeScript
- **Frontend**: Vanilla HTML/CSS/JavaScript (ES6+)
- **Database**: SQLite (better-sqlite3) with WAL mode
- **APIs**:
  - Deepgram (Speech-to-Text)
  - Google Gemini 2.5 Flash (Fact-checking)
  - Pavlok API v5 (Stimulus delivery - DIRECT API, not Zapier MCP)
- **Communication**: WebSocket (ws library)

### Current Implementation Status

#### COMPLETED (100%)

**Frontend Application** (2,517 lines of code):
- Location: /Users/seane/Documents/Github/zapd/Realibuddy/frontend/
- Files:
  - index.html - Main UI (272 lines)
  - css/styles.css - Custom styles (340 lines)
  - css/animated-background.css - Background animations (400 lines)
  - js/app.js - State management & UI updates (681 lines)
  - js/audio.js - Microphone capture & PCM encoding (269 lines)
  - js/websocket.js - WebSocket client with reconnection (255 lines)
  - js/background-animation.js - Canvas animations (297 lines)

**Frontend Features:**
- Status indicators (Microphone, Connection, STT, Fact-checking)
- Start/Stop monitoring button
- Emergency stop button (prominent red, disables all zaps)
- Session statistics (zap count, cooldown timer, claims checked, truth rate)
- Live transcript display (interim + final results)
- Fact-check results panel with verdict cards
- Settings panel (base intensity 10-80, WebSocket URL, auto-reconnect)
- Toast notifications (error/success)
- localStorage persistence for settings

**Audio Capture:**
- 16-bit PCM encoding at 16kHz, mono
- WebRTC getUserMedia API
- Float32 → Int16 conversion
- Chunks streamed via WebSocket

**Backend Application** (100% complete):
- Location: /Users/seane/Documents/Github/zapd/Realibuddy/backend/
- Server running on port 3001
- Database: realibuddy.db (SQLite with WAL mode)

**Backend Files:**
- src/server.ts - Express + HTTP + WebSocketServer, global SafetyManager
- src/utils/config.ts - Environment variable loader (.env from parent dir)
- src/websocket/handler.ts - WebSocket message handler implementing exact protocol
- src/services/deepgram.ts - Deepgram WebSocket streaming (nova-2, linear16, 16kHz)
- src/services/gemini.ts - Gemini API with google_search_retrieval (dynamic_threshold: 0.7)
- src/services/pavlok.ts - Pavlok API v5 SDK integration (stimulus_create_api_v5_stimulus_send_post)
- src/services/database.ts - SQLite with zap_history & safety_state tables
- src/services/safety.ts - SafetyManager with DB persistence, hourly limits, cooldown

**Backend Implementation Details:**

*server.ts:*
- Express app with CORS
- HTTP server + WebSocketServer
- Global singleton SafetyManager shared across all connections
- Graceful shutdown handler
- Health check endpoint at /health

*websocket/handler.ts:*
- Implements exact message protocol from plan.md lines 147-163
- Binary audio detection (checks if data[0] === 0x7B for JSON)
- Handles 4 client message types: audio_chunk, start_monitoring, stop_monitoring, emergency_stop
- Sends 8 server message types: transcript_interim, transcript_final, fact_check_started, fact_check_result, zap_delivered, safety_status, error, success
- Per-connection DeepgramService, shared GeminiService, PavlokService, SafetyManager
- Accepts optional baseIntensity from client, clamped to 10-80
- Zap intensity calculation: Math.floor(baseIntensity * confidence), capped at 100, min 1

*services/deepgram.ts:*
- Uses @deepgram/sdk v3.8.0
- WebSocket to wss://api.deepgram.com/v1/listen
- Model: nova-2, language: en
- Audio: linear16 encoding, 16000 Hz, mono
- Parameters: smart_format, punctuate, interim_results enabled
- Callbacks for interim and final transcripts
- Auth: Token DEEPGRAM_API_KEY

*services/gemini.ts:*
- Uses @google/genai v0.3.0
- Model: gemini-2.5-flash
- google_search_retrieval tool with DynamicRetrievalConfigMode.MODE_DYNAMIC, dynamicThreshold: 0.7
- response_mime_type: application/json
- Structured JSON response: {verdict: 'true'|'false'|'unverifiable', confidence: 0.0-1.0, evidence: string}
- System prompt instructs to verify facts, return unverifiable for opinions
- Validates response structure, clamps confidence 0-1, defaults to unverifiable on error

*services/pavlok.ts:*
- Imports SDK from ../../../.api/apis/pavlok/index.js
- Auth via pavlok.auth(PAVLOK_API_TOKEN)
- Calls stimulus_create_api_v5_stimulus_send_post with {stimulus: {stimulusType: 'zap', stimulusValue: 1-100, reason: string}}
- Validates intensity 1-100, throws error if out of range
- Logs zap delivery and errors

*services/database.ts:*
- Uses better-sqlite3 v11.7.0
- Database path: join(process.cwd(), 'realibuddy.db')
- WAL mode enabled (journal_mode = WAL)
- Tables:
  - zap_history: (id INTEGER PRIMARY KEY, timestamp INTEGER, intensity INTEGER, claim TEXT)
  - safety_state: (id INTEGER PRIMARY KEY CHECK(id=1), emergency_stop_active INTEGER DEFAULT 0)
- Singleton pattern via getDatabase()
- Methods: recordZap, getZapsInTimeRange, getZapsInLastHour, getAllZaps, getLastZapTimestamp, getEmergencyStopState, setEmergencyStopState, deleteOldZaps, clearAllData

*services/safety.ts:*
- Loads state from database on init
- In-memory cache: emergencyStopActive, lastZapTime
- canZap() checks: emergency stop NOT active, < MAX_ZAPS_PER_HOUR (10) in last hour, >= ZAP_COOLDOWN_MS (5000ms) since last zap
- recordZap(intensity, claim) saves to DB and updates in-memory state
- emergencyStop() persists to DB, irreversible except manual DB edit or server restart
- Cleanup method to delete zaps older than 24 hours

**Pavlok SDK Installation:**
- SDK installed to .api/apis/pavlok/ via npx api install "@pavlok/v5.0#p2k4b1mltos4gjz"
- Dependencies: api@^6.1.3, json-schema-to-ts@^2.8.0-beta.0, oas@^20.11.0
- Added to backend/package.json dependencies
- Imports SDK from relative path ../../../.api/apis/pavlok/index.js

**Pavlok Authentication:**
- User registered/logged in via Pavlok API
- Email: seanesla1156@gmail.com
- Token obtained via curl to POST /api/v5/users/login
- Token stored in .env as PAVLOK_API_TOKEN
- Token expires: 1794164250 (timestamp)

**Documentation:**
- .claude/CLAUDE.md - Project overview and API references
- .claude/docs/gemini.json - Complete Gemini API documentation
- .claude/docs/deepgram.json - Complete Deepgram API documentation
- .claude/docs/pavlok.json - Complete Pavlok API v5 documentation
- DESCRIPTION.md - Project TL;DR
- README.md - Full project documentation

**Git Repository:**
- Location: /Users/seane/Documents/Github/zapd/Realibuddy/.git/
- Branch: main
- Latest commits:
  - 4db1a5a docs: add project documentation and implementation plan
  - 2e8854c fffff
  - c3ccb83 Merge branch 'feat/setup'

**Environment Variables (.env in project root):**
- DEEPGRAM_API_KEY=b9e96524dc53195e31fa0e974175a9668da4df17
- GEMINI_API_KEY=AIzaSyB3L4zWjpf6JflKQLr57EbfO6W4omRy3J0
- PAVLOK_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6bnVsbCwiaWQiOjM2MTA1NywiZW1haWwiOiJzZWFuZXNsYTExNTZAZ21haWwuY29tIiwiaXNfYXBwbGljYXRpb24iOmZhbHNlLCJleHAiOjE3OTQxNjQyNTAsInN1YiI6ImFjY2VzcyJ9.c2HczE-X5_xOXt4HKDAGBzFT2ZjlE7D5UxNkHV7al08

**Backend Dependencies (backend/package.json):**
```json
{
  "dependencies": {
    "@deepgram/sdk": "^3.8.0",
    "@google/genai": "^0.3.0",
    "express": "^5.0.0",
    "ws": "^8.18.0",
    "dotenv": "^16.4.5",
    "cors": "^2.8.5",
    "api": "^6.1.3",
    "json-schema-to-ts": "^2.8.0-beta.0",
    "oas": "^20.11.0",
    "better-sqlite3": "^11.7.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/ws": "^8.5.13",
    "@types/node": "^22.0.0",
    "@types/better-sqlite3": "^7.6.12",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "esbuild": "^0.24.0",
    "vitest": "^2.1.0"
  }
}
```

**Backend Server Status:**
- Running: Yes
- Port: 3001
- Process: npm run dev (tsx watch src/server.ts)
- Database: Created at backend/realibuddy.db with WAL files
- SafetyManager: Initialized, emergency_stop=false, last_zap=never, zaps_in_hour=0

**.gitignore:**
- .env
- *.db, *.db-shm, *.db-wal
- node_modules/
- .api/
- get-pavlok-token.js

#### NOT STARTED

**End-to-End Testing:**
- Frontend to backend WebSocket connection
- Microphone capture and audio streaming
- Deepgram real-time transcription
- Gemini fact-checking with web search
- Pavlok zap delivery
- Safety limits enforcement (10 zaps/hour, 5s cooldown, emergency stop)
- Database persistence across server restarts

**Deployment:**
- Not yet planned

### Critical User Preferences & Instructions

#### User's Rules (MUST FOLLOW):
1. "dont guess/assume anything. dont leave anything ambiguous" - Always verify, never assume
2. "no placeholders" - Everything must be real and functional
3. "no mocks" - Use real implementations only
4. "ensure you dont cut corners" - Complete implementations required
5. "DO NOT fucking rush" - Take time to do things properly
6. "dont use emojis" - No emojis in code or documentation unless explicitly requested
7. No fake content - No fake quotes, emails, testimonials, or placeholder data
8. "dont do some rudimentary shit. follow plan.md at all times" - Always reference plan.md for exact specifications
9. "make a granulated, unambiguous todo list" - Todo lists must be detailed and specific

#### Technical Decisions Made:
- Zap intensity: Proportional to confidence (user's request: "how about the zap strength is proportional to the lie percentage")
- Formula: Math.floor(baseIntensity * confidence) where baseIntensity = 10-80 from settings, safety cap at 100
- Transcription mode: Show interim results in UI, fact-check only final utterances
- Pavlok integration: Use direct Pavlok API v5, NOT Zapier MCP (MCP tools only available in Claude Code, not in backend)
- Database: SQLite for local persistence, survives server restarts
- SafetyManager: Global singleton shared across all WebSocket connections (not per-connection)
- .env location: Project root, backend loads via dotenv with path: join(process.cwd(), '..', '.env')

#### Confirmed API Specifications:

**Gemini API:**
- Model: gemini-2.5-flash
- Endpoint: POST /v1beta/models/{model}:generateContent
- Base URL: https://generativelanguage.googleapis.com
- Auth: x-goog-api-key header (via SDK: GoogleGenAI({apiKey}))
- Web search: google_search_retrieval tool with dynamic_threshold: 0.7
- Structured output: response_mime_type: "application/json"
- Response format: {verdict: 'true'|'false'|'unverifiable', confidence: 0.0-1.0, evidence: string}

**Deepgram API:**
- WebSocket URL: wss://api.deepgram.com/v1/listen
- Model: nova-2
- Auth: Authorization: Token YOUR_DEEPGRAM_API_KEY (via SDK: createClient(API_KEY))
- Audio: linear16 encoding, 16000 Hz, mono
- Parameters: interim_results=true, punctuate=true, smart_format=true
- Events: LiveTranscriptionEvents.Transcript (data.is_final, data.channel.alternatives[0].transcript)

**Pavlok API v5:**
- Endpoint: POST https://api.pavlok.com/api/v5/stimulus/send
- Auth: Authorization: YOUR_API_TOKEN (via SDK: pavlok.auth(token))
- SDK method: stimulus_create_api_v5_stimulus_send_post({stimulus: {...}})
- Body: {stimulus: {stimulusType: 'zap'|'beep'|'vibe', stimulusValue: 1-100, reason: string}}
- CRITICAL: Intensity range is 1-100, NOT 0-255 (user corrected this assumption)

#### Safety Requirements (IMPLEMENTED):
- Maximum 10 zaps per hour (MAX_ZAPS_PER_HOUR config)
- Minimum 5-second cooldown between zaps (ZAP_COOLDOWN_MS = 5000)
- Emergency stop button (disables all zaps, persists to DB, cannot be undone without manual intervention)
- Zap intensity: Math.floor(baseIntensity * confidence) where baseIntensity = 10-80
- Safety cap: Never exceed 100 intensity, minimum 1
- Database persistence: zap_history and safety_state tables

### WebSocket Message Protocol (IMPLEMENTED)

**Client → Server:**
- { type: 'audio_chunk', data: ArrayBuffer }  // Binary audio (detected if data[0] !== 0x7B)
- { type: 'start_monitoring', baseIntensity?: number }
- { type: 'stop_monitoring' }
- { type: 'emergency_stop' }

**Server → Client:**
- { type: 'transcript_interim', text: string, timestamp: number }
- { type: 'transcript_final', text: string, timestamp: number }
- { type: 'fact_check_started', claim: string }
- { type: 'fact_check_result', claim: string, verdict: 'true'|'false'|'unverifiable', confidence: number, evidence: string }
- { type: 'zap_delivered', intensity: number, reason: string }
- { type: 'safety_status', zapCount: number, canZap: boolean }
- { type: 'error', message: string }
- { type: 'success', message: string }

### Important Context

**MCP Tools Limitation:**
- The Zapier MCP tools (mcp__zapier__pavlok_wearable_device_zap) are ONLY available in Claude Code (this AI assistant)
- They are NOT available in backend code or to Gemini API
- Backend MUST use direct Pavlok API v5 HTTP endpoints via the official SDK
- Zapier MCP was used only for testing/prototyping during development (already completed)

**Directory Structure:**
- Working directory: /Users/seane/Documents/Github/zapd/Realibuddy/
- Frontend: /Users/seane/Documents/Github/zapd/Realibuddy/frontend/
- Backend: /Users/seane/Documents/Github/zapd/Realibuddy/backend/
- .env: /Users/seane/Documents/Github/zapd/Realibuddy/.env (parent of backend)
- Database: /Users/seane/Documents/Github/zapd/Realibuddy/backend/realibuddy.db
- Pavlok SDK: /Users/seane/Documents/Github/zapd/Realibuddy/.api/apis/pavlok/

**Known Issues & Decisions:**
- Background animation files exist but landing page was deleted (user's choice)
- Free tier rate limits need to be considered for testing
- User encountered 15k+ files staged for commit - fixed by adding node_modules/, .api/, *.db to .gitignore
- .env path resolution: Backend runs from /backend directory, so .env loads from join(process.cwd(), '..', '.env')

### Next Steps (End-to-End Testing)

1. Open frontend/index.html in browser
2. Test WebSocket connection to ws://localhost:3001
3. Test microphone access and audio capture
4. Test Deepgram transcription (interim and final)
5. Test Gemini fact-checking with verifiable claims
6. Test Pavlok zap delivery with false claims
7. Test safety limits (10 zaps/hour, 5s cooldown)
8. Test emergency stop persistence
9. Test database persistence across server restarts
10. Fix any bugs discovered during testing

### Important Files for Next Developer

**Configuration:**
- backend/src/utils/config.ts - Environment variable loader
- backend/tsconfig.json - TypeScript configuration
- backend/package.json - Dependencies and scripts
- .gitignore - Exclusions (node_modules, .api, .db, .env)

**Backend Core:**
- backend/src/server.ts - Main entry point
- backend/src/websocket/handler.ts - WebSocket message handling
- backend/src/services/deepgram.ts - Speech-to-text integration
- backend/src/services/gemini.ts - Fact-checking with AI
- backend/src/services/pavlok.ts - Zap delivery
- backend/src/services/database.ts - SQLite persistence
- backend/src/services/safety.ts - Safety enforcement

**Frontend:**
- frontend/index.html - Main UI
- frontend/js/app.js - Application state and UI logic
- frontend/js/websocket.js - WebSocket client
- frontend/js/audio.js - Microphone capture and PCM encoding

**Documentation:**
- .claude/CLAUDE.md - Quick reference for Claude Code
- .claude/plan.md - This file (implementation plan and status)
- .claude/docs/gemini.json - Gemini API docs
- .claude/docs/deepgram.json - Deepgram API docs
- .claude/docs/pavlok.json - Pavlok API v5 docs
- README.md - Project documentation
- DESCRIPTION.md - Project TL;DR

### Commands

**Start backend server:**
```bash
cd /Users/seane/Documents/Github/zapd/Realibuddy/backend
npm run dev
```

**Build backend:**
```bash
cd /Users/seane/Documents/Github/zapd/Realibuddy/backend
npm run build
```

**Open frontend:**
```bash
open /Users/seane/Documents/Github/zapd/Realibuddy/frontend/index.html
```

**Check database:**
```bash
sqlite3 /Users/seane/Documents/Github/zapd/Realibuddy/backend/realibuddy.db
```

**Reset emergency stop (if needed):**
```sql
UPDATE safety_state SET emergency_stop_active = 0 WHERE id = 1;
```
