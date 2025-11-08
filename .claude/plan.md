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
- [x] Add RealiBuddy logo to frontend
- [x] Fix frontend WebSocket URL (was 3000, now 3001)
- [x] Resolve Git merge conflicts
- [ ] Complete integration testing (comprehensive test suite) <- IN PROGRESS
- [ ] End-to-end testing with voice and Pavlok device
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

#### COMPLETED (95%)

**Frontend Application** (2,517 lines + logo):
- Location: /Users/seane/Documents/Github/zapd/Realibuddy/frontend/
- Files:
  - index.html - Main UI with RealiBuddy logo (272 lines)
  - assets/logo.svg - RealiBuddy logo (970KB SVG)
  - css/styles.css - Custom styles (340 lines)
  - css/animated-background.css - Background animations (400 lines)
  - js/app.js - State management & UI updates (681 lines)
  - js/audio.js - Microphone capture & PCM encoding (269 lines)
  - js/websocket.js - WebSocket client (ws://localhost:3001) (255 lines)
  - js/background-animation.js - Canvas animations (297 lines)

**Frontend Features:**
- Logo in header (64x64px, left of title)
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

**Backend Application** (100% implemented, not fully tested):
- Location: /Users/seane/Documents/Github/zapd/Realibuddy/backend/
- Server running on port 3001
- Database: realibuddy.db (SQLite with WAL mode)
- Health endpoint: http://localhost:3001/health (tested, working)

**Backend Files:**
- src/server.ts - Express + HTTP + WebSocketServer, global SafetyManager (resolved merge conflicts)
- src/utils/config.ts - Environment variable loader (.env from parent dir)
- src/websocket/handler.ts - WebSocket message handler implementing exact protocol
- src/services/deepgram.ts - Deepgram WebSocket streaming (nova-2, linear16, 16kHz) (resolved merge conflicts)
- src/services/gemini.ts - Gemini API with google_search_retrieval (dynamic_threshold: 0.7)
- src/services/pavlok.ts - Pavlok API v5 SDK integration (stimulus_create_api_v5_stimulus_send_post)
- src/services/database.ts - SQLite with zap_history & safety_state tables
- src/services/safety.ts - SafetyManager with DB persistence, hourly limits, cooldown

**Backend Implementation Details:**

*server.ts:*
- Express app with CORS
- HTTP server + WebSocketServer
- Global singleton SafetyManager shared across all connections
- Graceful shutdown handler (SIGTERM)
- Health check endpoint at /health (verified working)
- Git merge conflicts resolved (kept our implementation over conflicting branch)

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
- Git merge conflicts resolved

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
- Can be modified to send 'beep' instead of 'zap' for testing

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
- emergencyStop() persists to DB, irreversible except manual DB edit or resetEmergencyStop()
- resetEmergencyStop() added for testing purposes
- Cleanup method to delete zaps older than 24 hours

**Pavlok SDK Installation:**
- SDK installed to .api/apis/pavlok/ via npx api install "@pavlok/v5.0#p2k4b1mltos4gjz"
- Dependencies: api@^6.1.3, json-schema-to-ts@^2.8.0-beta.0, oas@^20.11.0
- Added to backend/package.json dependencies
- Imports SDK from relative path ../../../.api/apis/pavlok/index.js
- Git merge conflicts in package.json resolved

**Pavlok Authentication:**
- User registered/logged in via Pavlok API
- Email: seanesla1156@gmail.com
- Token obtained via curl to POST /api/v5/users/login
- Token stored in .env as PAVLOK_API_TOKEN
- Token expires: 1794164250 (Unix timestamp)

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
  - d836752 resolve: merge conflicts by keeping our backend implementation
  - 97b2c4a feat(backend): complete backend implementation with all integrations
  - 4db1a5a docs: add project documentation and implementation plan

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
  }
}
```

**Backend Server Status:**
- Running: Yes (port 3001)
- Process: npm run dev (tsx watch src/server.ts)
- Database: Created at backend/realibuddy.db with WAL files
- SafetyManager: Initialized on server start
- Health check: curl http://localhost:3001/health returns {"status":"ok","timestamp":"..."}

**.gitignore:**
- .env
- *.db, *.db-shm, *.db-wal
- node_modules/
- .api/
- get-pavlok-token.js

**Test Infrastructure:**
- backend/test-integration.js created (comprehensive test suite)
- Tests all integrations WITHOUT voice/audio
- Tests use beep instead of zap for safety
- 10 test cases covering: WebSocket, Deepgram, Gemini, Pavlok, SafetyManager, Database, Emergency Stop, Intensity Calculation, Cooldown, Hourly Limit
- Current status: Test file created but has a bug (setTimeout import issue)

#### IN PROGRESS

**Integration Testing:**
- Comprehensive test suite created but not running yet (setTimeout import error)
- Need to fix test-integration.js to use proper Node.js timer functions
- Tests planned:
  1. WebSocket connection and initial safety_status
  2. WebSocket message protocol (start/stop/emergency)
  3. Deepgram API connection
  4. Gemini API fact-checking
  5. Pavlok API beep delivery (not zap)
  6. SafetyManager cooldown and counting
  7. Database persistence
  8. Emergency stop persistence
  9. Zap intensity calculation
  10. Hourly limit (10 zaps max)

#### NOT STARTED

**End-to-End Testing with Voice:**
- Microphone capture and audio streaming
- Real-time Deepgram transcription
- Gemini fact-checking with web search
- Actual Pavlok zap delivery (user requested NO zaps during testing, use beep)
- Safety limits in real conditions

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
10. "test absolutely everything" - Comprehensive testing required
11. "dont test voice features yet" - Skip microphone/audio testing for now
12. "do not zap me, just test with beep/tone instead" - Use Pavlok beep, NOT zap during testing
13. "ultrathink" - Think deeply and carefully about all aspects

#### Technical Decisions Made:
- Zap intensity: Proportional to confidence (user's request: "how about the zap strength is proportional to the lie percentage")
- Formula: Math.floor(baseIntensity * confidence) where baseIntensity = 10-80 from settings, safety cap at 100
- Transcription mode: Show interim results in UI, fact-check only final utterances
- Pavlok integration: Use direct Pavlok API v5, NOT Zapier MCP (MCP tools only available in Claude Code, not in backend)
- Database: SQLite for local persistence, survives server restarts
- SafetyManager: Global singleton shared across all WebSocket connections (not per-connection)
- .env location: Project root, backend loads via dotenv with path: join(process.cwd(), '..', '.env')
- Frontend WebSocket URL: ws://localhost:3001 (was 3000, fixed)
- Logo placement: Header, 64x64px, left of title with flexbox layout
- Merge conflicts: Resolved by keeping our implementation (git checkout --ours)
- Testing approach: Use beep instead of zap, no voice testing yet

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
- For testing: Use 'beep' instead of 'zap'

#### Safety Requirements (IMPLEMENTED):
- Maximum 10 zaps per hour (MAX_ZAPS_PER_HOUR config)
- Minimum 5-second cooldown between zaps (ZAP_COOLDOWN_MS = 5000)
- Emergency stop button (disables all zaps, persists to DB, cannot be undone without manual intervention)
- Zap intensity: Math.floor(baseIntensity * confidence) where baseIntensity = 10-80
- Safety cap: Never exceed 100 intensity, minimum 1
- Database persistence: zap_history and safety_state tables

### WebSocket Message Protocol (IMPLEMENTED)

**Client → Server:**
- Binary audio (detected if data[0] !== 0x7B): Raw PCM audio chunks
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
- Logo: /Users/seane/Documents/Github/zapd/Realibuddy/frontend/assets/logo.svg

**Known Issues & Decisions:**
- Frontend WebSocket URL was pointing to port 3000, fixed to 3001
- Git merge conflicts occurred from divergent branches, resolved by keeping our implementation
- 15k+ files were staged for commit due to node_modules, fixed by adding to .gitignore
- .env path resolution: Backend runs from /backend directory, so .env loads from join(process.cwd(), '..', '.env')
- Test suite has setTimeout import bug, needs fixing before running tests
- User explicitly requested NO zaps during testing, use beep instead
- User explicitly requested NO voice testing yet

**Production Readiness Status:**
- Backend: 100% implemented, 0% tested
- Frontend: 100% implemented, 0% tested
- Integration: 0% tested (test suite created but not running)
- Status: NOT production ready, needs comprehensive testing

### Next Steps (Integration Testing)

1. Fix test-integration.js setTimeout import issue
2. Run comprehensive test suite (10 tests)
3. Fix any bugs discovered
4. Verify all integrations work without voice/audio
5. Test Pavlok beep delivery (not zap)
6. Verify database persistence
7. Verify safety limits enforcement
8. Document test results
9. Only after all tests pass: Begin voice/audio testing
10. Only after voice tests pass: Begin zap testing (with user's explicit permission)

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
- frontend/index.html - Main UI with logo
- frontend/assets/logo.svg - RealiBuddy logo (970KB)
- frontend/js/app.js - Application state and UI logic
- frontend/js/websocket.js - WebSocket client (connects to ws://localhost:3001)
- frontend/js/audio.js - Microphone capture and PCM encoding

**Testing:**
- backend/test-integration.js - Comprehensive test suite (has setTimeout bug)

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

**Run integration tests (after fixing setTimeout bug):**
```bash
cd /Users/seane/Documents/Github/zapd/Realibuddy/backend
node test-integration.js
```

**Check backend health:**
```bash
curl http://localhost:3001/health
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

**Clear all test data:**
```sql
DELETE FROM zap_history;
UPDATE safety_state SET emergency_stop_active = 0 WHERE id = 1;
```

### Test Suite Bug to Fix

The test-integration.js file has this error:
```
TypeError [ERR_INVALID_ARG_TYPE]: The "delay" argument must be of type number. Received function
```

The issue is on line 39 where we import `setTimeout` from 'timers/promises' but then use it with the wrong syntax. The fix is to change:
```javascript
import { setTimeout } from 'timers/promises';
```

And use it as:
```javascript
await setTimeout(5100);  // Not: setTimeout(() => {...}, 5100)
```

Or alternatively, don't import from timers/promises and use the standard setTimeout with await:
```javascript
await new Promise(resolve => setTimeout(resolve, 5100));
```
