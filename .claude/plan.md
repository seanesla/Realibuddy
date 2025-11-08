# RealiBuddy Implementation Plan

## Todo List

- [x] Create project documentation and configuration
- [x] Add comprehensive API docs (Gemini, Deepgram, Pavlok)
- [x] Test Pavlok integration via Zapier MCP
- [x] Create .gitignore and initial commit
- [x] Build complete frontend application
- [ ] Build backend server with WebSocket support
- [ ] Implement Deepgram streaming integration
- [ ] Implement Gemini fact-checking pipeline
- [ ] Implement Pavlok API integration (direct API, not MCP)
- [ ] End-to-end testing
- [ ] Deployment

---

## Comprehensive Handoff Report

### Project Overview
**RealiBuddy** is a real-time lie detection system that monitors spoken statements, verifies facts using AI and web search, and delivers immediate behavioral feedback through Pavlok wearable device integration.

**Core Functionality:**
1. Browser captures microphone audio via WebRTC
2. Audio streams to backend via WebSocket
3. Backend forwards to Deepgram for speech-to-text (Nova-3 model, sub-300ms latency)
4. Transcripts sent to Gemini API for fact extraction and verification
5. False claims trigger Pavlok electric stimulus (intensity proportional to confidence)
6. Safety limits: 10 zaps/hour max, 5-second cooldown, emergency stop

### Technology Stack (CONFIRMED)
- **Backend**: Node.js 20.x LTS + TypeScript
- **Frontend**: Vanilla HTML/CSS/JavaScript (ES6+)
- **APIs**:
  - Deepgram (Speech-to-Text)
  - Google Gemini 2.5 Flash (Fact-checking)
  - Pavlok API v5 (Stimulus delivery - DIRECT API, not Zapier MCP)
- **Communication**: WebSocket (ws library)

### Current Implementation Status

#### COMPLETED

**Frontend Application** (100% complete - 2,517 lines of code):
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

**Documentation:**
- .claude/CLAUDE.md - Project overview and API references
- .claude/docs/gemini.json - Complete Gemini API documentation
- .claude/docs/deepgram.json - Complete Deepgram API documentation
- .claude/docs/pavlok.json - Complete Pavlok API v5 documentation
- DESCRIPTION.md - Project TL;DR
- README.md - Full project documentation

**Git Repository:**
- Location: /Users/seane/Documents/Github/zapd/Realibuddy/.git/
- Latest commit: c630c2f - Frontend implementation

**Environment:**
- .env file with API keys:
  - DEEPGRAM_API_KEY=b9e96524dc53195e31fa0e974175a9668da4df17
  - GEMINI_API_KEY=AIzaSyB3L4zWjpf6JflKQLr57EbfO6W4omRy3J0
  - No Pavlok token yet (needs to be obtained)

#### NOT STARTED

**Backend Implementation** (0% complete):
- Location: /Users/seane/Documents/Github/zapd/Realibuddy/backend/
- Existing files: package.json, tsconfig.json, basic structure
- Needs: Complete server implementation

### Critical User Preferences & Instructions

#### User's Rules (MUST FOLLOW):
1. "dont guess/assume anything. dont leave anything ambiguous" - Always verify, never assume
2. "no placeholders" - Everything must be real and functional
3. "no mocks" - Use real implementations only
4. "ensure you dont cut corners" - Complete implementations required
5. "DO NOT fucking rush" - Take time to do things properly
6. "dont use emojis" - No emojis in code or documentation unless explicitly requested
7. No fake content - No fake quotes, emails, testimonials, or placeholder data

#### Technical Decisions Made:
- Zap intensity: Proportional to confidence (user's request: "how about the zap strength is proportional to the lie percentage")
- Transcription mode: Show interim results in UI, fact-check only final utterances
- Pavlok integration: Use direct Pavlok API v5, NOT Zapier MCP (MCP tools only available in Claude Code, not in backend)
- No landing page: User deleted landing page

#### Confirmed API Specifications:

**Gemini API:**
- Model: gemini-2.5-flash or gemini-2.5-flash-lite (cheaper)
- Endpoint: POST /v1beta/models/{model}:generateContent
- Base URL: https://generativelanguage.googleapis.com
- Auth header: x-goog-api-key
- Web search: google_search_retrieval tool with dynamic_threshold: 0.7
- Structured output: response_mime_type: "application/json"
- Pricing (Flash-Lite): $0.10 input / $0.40 output per 1M tokens

**Deepgram API:**
- WebSocket URL: wss://api.deepgram.com/v1/listen
- Model: nova or nova-3
- Auth: Authorization: Token YOUR_DEEPGRAM_API_KEY
- Audio: linear16 encoding, 16000 Hz, mono
- Parameters: interim_results=true, punctuate=true, smart_format=true
- Free tier: $200 one-time credit
- Pricing: $0.0059/minute

**Pavlok API v5:**
- Endpoint: POST https://api.pavlok.com/api/v5/stimulus/send
- Auth: Authorization: YOUR_API_TOKEN
- CRITICAL: Intensity range is 1-100, NOT 0-255 (user corrected this assumption)

#### Safety Requirements (MUST IMPLEMENT):
- Maximum 10 zaps per hour
- Minimum 5-second cooldown between zaps
- Emergency stop button (disables all zaps, cannot be undone without refresh)
- Zap intensity: Math.floor(baseIntensity * confidence) where baseIntensity = 10-80
- Safety cap: Never exceed 100 intensity

### WebSocket Message Protocol

**Client → Server:**
- { type: 'audio_chunk', data: ArrayBuffer }  // Binary audio
- { type: 'start_monitoring' }
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

**MCP Tools Confusion:**
- The Zapier MCP tools (mcp__zapier__pavlok_wearable_device_zap) are ONLY available in Claude Code (this AI assistant)
- They are NOT available in backend code or to Gemini API
- Backend must use direct Pavlok API v5 HTTP endpoints
- Zapier MCP was used only for testing/prototyping during development

**Directory Structure:**
- Working directory: /Users/seane/Documents/Github/zapd/Realibuddy/
- All files consolidated in Realibuddy directory
- .claude/ files copied from original Realibuddy repo

**Known Issues:**
- Background animation files exist but landing page was deleted (user's choice)
- background-animation.js and animated-background.css can be deleted if not needed
- Free tier rate limits need to be considered for testing
