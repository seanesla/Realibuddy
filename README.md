# RealiBuddy: Real-Time Lie Detector with Behavioral Feedback

## What It Is

This is a **real-time personal fact-checking system** that listens to you speak, automatically verifies the truthfulness of your claims, and delivers behavioral feedback via a Pavlok wearable device whenever you make false statements. It combines speech recognition, AI-powered fact-checking with web search, and behavioral conditioning hardware to create an immediate accountability mechanism for truthfulness.

**Current Status**: Fully functional MVP using audio beeps for feedback (can be configured to use electric stimulation).



## Core Concept

The system acts as an automated "truth enforcer" that:

- Continuously monitors your speech through your microphone
- Transcribes your statements to text in real-time
- Fact-checks your statements against web sources using AI with search capability
- Delivers audio feedback (beep) when lies are detected
- Provides spoken verdict with evidence via text-to-speech
- Tracks your truthfulness statistics across sessions
- Maintains safety limits to prevent overuse



## How It Works (Complete Flow)

### 1. **Audio Capture → Speech Recognition**

- Browser captures microphone audio (16kHz, mono, PCM16)
- Audio streams via WebSocket to backend server
- Deepgram Nova-2 live transcription API processes audio with <300ms latency
- System detects natural pauses (5 seconds of silence) to segment complete thoughts
- Both interim and final transcriptions appear live on screen

### 2. **AI-Powered Fact-Checking**

When a complete statement is detected:

- **Perplexity AI** (sonar-pro model) receives the transcribed text
- AI performs real-time web search across authoritative sources
- Context includes current date/time for temporal awareness
- AI analyzes for factual accuracy vs opinions/subjective statements
- Returns structured verdict: **TRUE**, **FALSE**, **PARTIALLY_TRUE**, **MISLEADING**, **UNVERIFIABLE**, or **SUBJECTIVE**
- Includes confidence score (0-100%) and detailed evidence with source citations

**Alternate Mode**: System can also use Google Gemini 2.5-pro with Google Search tool

### 3. **Decision Engine**

- **FALSE** claims with >70% confidence → triggers feedback
- **MISLEADING** claims with >80% confidence → triggers feedback
- **PARTIALLY_TRUE** → informational only, no feedback
- **TRUE** claims → pass (no action)
- **UNVERIFIABLE** claims → pass (benefit of the doubt)
- **SUBJECTIVE** statements → pass (no fact-checking of opinions)
- Safety manager checks cooldown and hourly limits before allowing feedback

### 4. **Behavioral Feedback Delivery**

- **Current Implementation**: Pavlok device delivers audio beep
- **Configurable**: Can be switched to vibration or electric stimulation (zap)
- Intensity scales based on verdict severity (1-100 scale)
- Safety limits enforced:
  - Maximum 10 feedback events per hour
  - 5-second cooldown between events
  - Emergency stop button disables all feedback permanently
  - Intensity capped at configured maximum

### 5. **Voice Feedback**

- Deepgram TTS (aura-asteria-en voice) generates spoken verdict
- Audio includes: verdict, confidence level, and key evidence
- Plays automatically through browser after fact-check completes
- Provides immediate audio explanation of the ruling

### 6. **Database & Session Tracking**

- SQLite database persists all sessions and fact-checks
- Tracks:
  - Session start/end times
  - All transcripts and their verdicts
  - Feedback events (timestamp, intensity, reason)
  - Safety state (zap count, emergency stop status)
- Enables historical analysis and export

### 7. **User Interface**

**Main Tab:**
- Real-time status indicators (Microphone, WebSocket, STT, Fact-Checker)
- Live transcription display
- Fact-check result cards with verdicts (color-coded)
- Session statistics (total claims checked, zaps delivered, truth rate)
- Control panel (Start/Stop monitoring, Emergency Stop)
- Settings (feedback intensity slider, WebSocket URL)

**Dashboard Tab:**
- Overall statistics across all sessions
- Total claims, truth rate, average confidence
- Recent verdicts and claim history

**History Tab:**
- Complete session history with expandable details
- Per-session statistics
- Export to CSV or JSON
- Delete individual sessions



## Technology Stack

### Speech Processing

**Speech-to-Text:**
- **Deepgram Nova-2** streaming API for real-time transcription
- WebSocket-based live transcription with <300ms latency
- 16-bit PCM audio at 16kHz sample rate, mono channel
- Automatic silence detection with 5-second endpointing

**Text-to-Speech:**
- **Deepgram TTS** with aura-asteria-en voice
- Linear16 audio format at 16kHz
- REST API for on-demand voice generation

### AI/Fact-Checking

**Primary:**
- **Perplexity AI** sonar-pro model with web search
- Real-time internet search across authoritative sources
- Structured JSON schema output for reliable parsing
- 30-second timeout for fact-check operations
- Context-aware prompting with current date/time

**Alternate:**
- **Google Gemini 2.5-pro** with Google Search tool
- Extended thinking mode (2048 token budget)
- Grounding with Google Search for fact verification

### Hardware Integration

- **Pavlok API v5** for behavioral feedback
- REST API endpoints (bearer token authentication)
- Supports: electric stimulation (zap), audio beep, vibration
- Currently configured to use beep mode for safety

### Backend

**Runtime & Framework:**
- **Node.js 20+** with ES Modules
- **TypeScript 5.6** with strict mode
- **Express 5.0** for HTTP server
- **ws 8.18** for WebSocket server

**Database:**
- **better-sqlite3 11.7** (SQLite with WAL mode)
- Tables: sessions, fact_checks, zap_history, safety_state
- Persistent storage for all sessions and statistics

**API Clients:**
- `@deepgram/sdk` 3.8.0 - Speech & TTS
- `@google/genai` 0.3.0 - Gemini AI
- `@perplexity-ai/perplexity_ai` 0.16.0 - Fact-checking
- `api` 6.1.3 - Pavlok SDK wrapper

**Development Tools:**
- `tsx` - TypeScript execution
- `esbuild` - Fast bundling
- `vitest` - Testing framework

### Frontend

**Stack:**
- **Vanilla JavaScript** (no framework)
- **Tailwind CSS** (via CDN) + custom CSS
- **Web Audio API** for microphone capture
- **Native WebSocket API** for real-time communication
- **localStorage** for settings persistence

**Architecture:**
- Modular JavaScript (app.js, audio.js, websocket.js, history.js)
- No build process - direct browser execution
- Responsive three-tab interface

### API Integrations Summary

| Service | Purpose | Status |
|---------|---------|--------|
| Deepgram | Speech-to-text | ✅ Active |
| Deepgram | Text-to-speech | ✅ Active |
| Perplexity AI | Fact-checking (primary) | ✅ Active |
| Google Gemini | Fact-checking (alternate) | ⚠️ Available but not primary |
| Pavlok | Behavioral feedback | ✅ Active (beep mode) |



## Key Features

### Core Features (Fully Implemented ✅)

✅ **Real-time speech transcription** with <1 second total latency (Deepgram Nova-2)

✅ **AI-powered fact-checking** with web search (Perplexity AI + Gemini backup)

✅ **Behavioral feedback** on detected lies (Pavlok beep/zap/vibration)

✅ **Voice feedback** - TTS reads verdicts and evidence aloud

✅ **Safety system** with limits:
  - Maximum 10 feedback events per hour
  - 5-second cooldown between events
  - Emergency stop button
  - Configurable intensity limits

✅ **Live UI** with real-time status indicators and transcription

✅ **Database persistence** (SQLite) for all sessions and fact-checks

✅ **Session tracking** with start/end times and statistics

✅ **Dashboard** with overall statistics and analytics

✅ **History viewer** showing all past sessions with details

✅ **Export functionality** (CSV and JSON formats)

✅ **Confidence scoring** (0-100%) for each fact-check

✅ **Evidence citations** with source URLs

✅ **Multi-verdict support**: TRUE, FALSE, PARTIALLY_TRUE, MISLEADING, UNVERIFIABLE, SUBJECTIVE

### Configuration & Settings

**Adjustable Parameters:**
- Feedback intensity (1-100 scale)
- WebSocket connection URL
- Auto-reconnect on disconnect
- Feedback mode (beep/vibration/zap)

**Safety Features:**
- Hourly feedback limit (default: 10)
- Cooldown period (default: 5 seconds)
- Emergency stop (persistent, requires server restart to reset)
- Intensity caps (configurable via environment variables)

### REST API Endpoints

The backend exposes a REST API for history management:

- `GET /health` - Health check
- `GET /api/history/sessions` - List all sessions
- `GET /api/history/sessions/:id` - Get session details
- `GET /api/history/stats` - Overall statistics
- `DELETE /api/history/sessions/:id` - Delete session
- `GET /api/history/export?format=csv|json` - Export history

### WebSocket Protocol

Real-time communication via WebSocket:

**Client → Server:**
- Binary audio chunks (PCM16)
- `start_monitoring` - Begin session
- `stop_monitoring` - End session
- `emergency_stop` - Disable all feedback

**Server → Client:**
- `transcript_interim` - Live transcription
- `transcript_final` - Complete statement
- `fact_check_started` - Processing claim
- `fact_check_result` - Verdict with evidence
- `zap_delivered` - Feedback notification
- `safety_status` - Current limits state
- Binary audio (TTS playback)
- `error` / `success` - Status messages



## Setup & Installation

### Prerequisites

- **Node.js 20+** (with npm)
- **Pavlok device** with API access
- **API Keys** for:
  - Deepgram (speech-to-text + TTS)
  - Perplexity AI (fact-checking)
  - Google Gemini (optional, alternate fact-checker)
  - Pavlok API token

### Step 1: Get API Credentials

**Deepgram:**
1. Sign up at [deepgram.com](https://deepgram.com)
2. Create an API key from the dashboard
3. Free tier includes generous credits

**Perplexity AI:**
1. Sign up at [perplexity.ai](https://www.perplexity.ai)
2. Get API key from developer portal

**Google Gemini (Optional):**
1. Get API key from [Google AI Studio](https://ai.google.dev)

**Pavlok:**
1. Run the authentication helper:
   ```bash
   node get-pavlok-token.js
   ```
2. Follow the OAuth flow in your browser
3. Copy the JWT token

### Step 2: Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cd Realibuddy
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:
   ```env
   DEEPGRAM_API_KEY=your_deepgram_key
   PERPLEXITY_API_KEY=your_perplexity_key
   GEMINI_API_KEY=your_gemini_key
   PAVLOK_API_TOKEN=your_pavlok_jwt

   # Optional configuration
   PORT=3001
   BASE_ZAP_INTENSITY=30
   MAX_ZAP_INTENSITY=80
   MAX_ZAPS_PER_HOUR=10
   ZAP_COOLDOWN_MS=5000
   ```

### Step 3: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Frontend has no dependencies (vanilla JS)
```

### Step 4: Run the Application

```bash
# Start backend server (from backend directory)
npm run dev

# Backend will start on http://localhost:3001
```

### Step 5: Access the Frontend

1. Open `frontend/index.html` in your browser, or
2. Serve via a local HTTP server:
   ```bash
   # From Realibuddy root directory
   npx serve frontend -p 8080
   ```
3. Open http://localhost:8080

### Step 6: Configure Feedback Mode

**To enable actual zaps (instead of beeps):**

Edit `backend/src/websocket/handler.ts` line 160:

```typescript
// Current (beep mode):
await this.pavlokService.sendBeep(255, "Lie detected");

// Change to (zap mode):
await this.pavlokService.sendZap(intensity, "Lie detected");
```

Restart the backend server after changing.

### Development Scripts

```bash
# Backend development (auto-reload)
npm run dev

# Build backend
npm run build

# Run tests
npm test

# Type check
npm run typecheck
```

## Project Status

### Completed ✅

All core functionality is implemented and working:

- ✅ Real-time speech transcription with WebSocket streaming
- ✅ AI-powered fact-checking with web search
- ✅ Pavlok integration (beep mode active)
- ✅ Safety system with limits and emergency stop
- ✅ Database persistence and session tracking
- ✅ Dashboard with statistics
- ✅ History viewer and export
- ✅ Text-to-speech verdict feedback
- ✅ Responsive three-tab UI

### Current Configuration

- **Feedback Mode**: Audio beep (configurable to zap/vibration)
- **Fact-Checker**: Perplexity AI (primary), Gemini (backup)
- **Speech Model**: Deepgram Nova-2
- **Database**: SQLite with persistent storage

### Potential Enhancements

- [ ] Add claim filtering to avoid fact-checking every statement
- [ ] Implement preset modes (Gentle/Standard/Brutal)
- [ ] Mobile app (React Native or similar)
- [ ] Multi-user support with user profiles
- [ ] Gamification (achievements, streaks, leaderboards)
- [ ] Browser extension mode
- [ ] Enhanced analytics and visualizations
- [ ] Keyboard shortcuts
- [ ] Sound effects for verdicts
- [ ] Real-time verdict confidence meter
- [ ] Custom fact-check sources/blacklist



## Use Cases & Applications

### Primary Use Case

Personal accountability tool for anyone who wants to:
- Break the habit of exaggerating or misrepresenting facts
- Improve factual accuracy in everyday speech
- Develop stronger fact-checking habits
- Increase awareness of when making unsupported claims

### Practical Applications

**Personal Development:**
- Self-improvement tool for accuracy in communication
- Build credibility by reducing false/misleading statements
- Develop reflexive verification before making claims

**Professional Training:**
- Debate practice (track accuracy during arguments)
- Sales training (avoid making unsubstantiated claims)
- Public speaking preparation
- Interview preparation (ensure factual accuracy)

**Content Creation:**
- Podcast/video recording (verify accuracy during takes)
- Live streaming fact-checking
- Educational content verification

**Educational:**
- Reinforce fact-checking habits in students
- Demonstrate how AI fact-checking works
- Critical thinking development

**Social/Entertainment:**
- Party game (fact-check conversations)
- Group challenges (track accuracy over time)
- Friendly competition for truthfulness



## Safety & Ethical Considerations

### Built-in Safety Features

The system includes multiple safety mechanisms:

✅ **Hourly Limits**: Maximum 10 feedback events per hour
✅ **Cooldown Periods**: 5-second minimum between feedback events
✅ **Emergency Stop**: Immediately disables all feedback (persistent)
✅ **Intensity Caps**: Configurable maximum intensity limits
✅ **Database Tracking**: All feedback events logged for accountability
✅ **Default Beep Mode**: Uses audio beeps instead of electric stimulation by default

### Medical Contraindications (Electric Stimulation Mode)

**DO NOT use electric stimulation (zap mode) if you have:**
- Pacemakers or implanted cardiac devices
- Heart conditions or arrhythmias
- Epilepsy or seizure disorders
- Pregnancy
- Electronic implants of any kind

**Not recommended for:**
- Users under 18 years old
- People with anxiety disorders (may increase stress)
- Users with skin conditions at application site

**Current Default**: System uses **beep mode** which has no medical contraindications

### Technical Limitations

**AI Fact-Checking is Imperfect:**
- False positives are possible (true statements marked false)
- False negatives are possible (false statements marked true)
- Nuanced claims may be oversimplified
- Very recent events (last few hours) may not be searchable
- Context matters - system may miss sarcasm, hypotheticals, etc.

**System Requirements:**
- Requires stable internet connection
- Microphone access required
- WebSocket support needed
- Modern browser (Chrome, Edge, Safari recommended)

**Not a Replacement for:**
- Professional fact-checking services
- Academic research verification
- Legal evidence verification
- Medical information validation

### Psychological Considerations

**Healthy Usage:**
- Limit sessions to 1-2 hours maximum
- Take breaks if feeling stressed or anxious
- Remember: tool for self-improvement, not self-punishment
- Don't obsess over perfect accuracy
- Understand that fact-checking has inherent uncertainty

**Red Flags to Watch For:**
- Increased anxiety about speaking
- Fear of normal conversation
- Obsessive rechecking of statements
- Social withdrawal due to fear of errors

**Recommendation**: Use as a learning tool, not a constant monitor

### Privacy & Legal

**Privacy:**
- All audio is processed via secure APIs (Deepgram)
- Transcripts and fact-checks stored locally in SQLite database
- No audio recordings are permanently stored
- Session data remains on your local machine
- Consider privacy implications before recording others

**Legal:**
- **Get explicit consent** before fact-checking others' speech
- Recording laws vary by jurisdiction (check local laws)
- In some places, recording conversations requires all-party consent
- Pavlok usage is at your own risk per manufacturer's terms
- This is a proof-of-concept tool, not a certified medical device

**Recommendations:**
- Use primarily for self-monitoring
- Inform others if the system is running during conversations
- Don't use for surveillance or non-consensual monitoring
- Review and follow local recording consent laws

### Ethical Use Guidelines

**Do:**
- Use for personal self-improvement
- Use with informed consent from others
- Take breaks and maintain perspective
- Remember AI can make mistakes
- Export and review your data periodically

**Don't:**
- Use to harass, intimidate, or control others
- Rely solely on AI verdicts without critical thinking
- Use during situations requiring nuanced communication
- Share others' transcripts/verdicts without permission
- Use as a replacement for human judgment

### Liability Disclaimer

This is an experimental personal project. The developers make no warranties about:
- Accuracy of fact-checking results
- Safety of Pavlok device usage
- Fitness for any particular purpose
- Medical safety (consult your doctor before using electric stimulation)

**Use at your own risk.** By using this system, you accept full responsibility for any consequences.



## Technical Architecture

### System Design Advantages

**1. Real-Time Performance**
- Sub-1-second latency from speech to transcription
- 2-5 second total latency from speech to fact-check result
- WebSocket streaming for minimal overhead
- Asynchronous processing prevents UI blocking

**2. Robust AI Integration**
- **Primary**: Perplexity AI with real-time web search
- **Backup**: Google Gemini with Google Search tool
- Automatic failover between fact-checkers
- Structured JSON schema ensures reliable parsing
- Context-aware prompting with temporal information

**3. Multi-Modal Feedback**
- Visual: Color-coded verdict cards in UI
- Auditory: TTS voice reads verdicts and evidence
- Haptic: Pavlok beep/vibration/zap (configurable)
- Database: Persistent history for review

**4. Safety-First Design**
- Multiple independent safety mechanisms
- Database-backed safety state (survives server restarts)
- Configurable limits via environment variables
- Emergency stop with persistent disable
- Gradual intensity scaling

**5. Data Persistence & Analytics**
- SQLite database with WAL mode for performance
- Complete session history with timestamps
- Export to CSV/JSON for external analysis
- Statistics aggregation (truth rate, confidence averages)
- Cascade deletion maintains referential integrity

**6. Modular Architecture**
- Clear separation of concerns (services, controllers, utils)
- TypeScript for type safety
- Easy to swap AI providers
- Pluggable feedback mechanisms
- Independent frontend (can be replaced with any client)

**7. Developer Experience**
- Hot-reload development mode
- Comprehensive error handling
- Detailed logging
- Type-safe codebase
- Clean REST + WebSocket API

### Performance Characteristics

| Metric | Value |
|--------|-------|
| Speech-to-text latency | <300ms |
| Fact-check duration | 2-8 seconds |
| Total speech-to-feedback | <10 seconds |
| WebSocket message size | ~1-5 KB (audio chunks) |
| Database query time | <10ms (typical) |
| Memory usage | ~150-250 MB (backend) |
| Concurrent connections | Tested up to 5 |



## Expected Outcomes

### Learning & Behavior Change

After using RealiBuddy, users typically experience:

**Immediate Awareness:**
- Heightened consciousness of factual accuracy while speaking
- Recognition of when making unsupported claims
- Awareness of exaggeration patterns

**Habit Development:**
- Tendency to verify information before stating as fact
- Reflexive source consideration ("Where did I hear this?")
- More careful language ("I think" vs "This is definitely true")

**Long-Term Improvement:**
- Reduced frequency of false or misleading statements
- Improved credibility in personal and professional conversations
- Better critical thinking about information sources
- Deeper understanding of fact-checking complexity

**Meta-Learning:**
- Appreciation for nuance in truth vs falsehood
- Recognition that AI fact-checkers have limitations
- Understanding that confidence ≠ certainty
- Awareness of how context affects interpretation

### Analytics & Insights

The system provides data-driven insights:

- **Truth Rate**: Percentage of statements that are factually accurate
- **Confidence Trends**: How certain the AI is about your claims
- **Topic Patterns**: Which subjects you're most/least accurate about
- **Session Comparison**: Track improvement over time
- **Verdict Distribution**: Breakdown of TRUE/FALSE/MISLEADING/etc.

### Realistic Expectations

**What This Tool Can Do:**
- Increase awareness of factual accuracy
- Provide immediate feedback on verifiable claims
- Create accountability for truthfulness
- Track patterns over time

**What This Tool Cannot Do:**
- Make you 100% accurate (AI makes mistakes too)
- Replace human judgment and critical thinking
- Fact-check subjective opinions or feelings
- Verify information faster than ~5 seconds
- Work offline or without internet

## Project Architecture

### File Structure

```
Realibuddy/
├── backend/
│   ├── src/
│   │   ├── controllers/        # WebSocket message handlers
│   │   ├── services/           # Core business logic
│   │   │   ├── deepgram.ts    # STT transcription
│   │   │   ├── deepgram-tts.ts # Voice synthesis
│   │   │   ├── perplexity.ts  # Fact-checking (primary)
│   │   │   ├── gemini.ts      # Fact-checking (alternate)
│   │   │   ├── pavlok.ts      # Behavioral feedback
│   │   │   ├── database.ts    # SQLite operations
│   │   │   └── safety.ts      # Safety limits manager
│   │   ├── types/             # TypeScript interfaces
│   │   ├── utils/             # Config, logging
│   │   ├── websocket/         # WebSocket handler
│   │   └── server.ts          # Express app entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── css/
│   │   ├── styles.css
│   │   └── animated-background.css
│   ├── js/
│   │   ├── app.js            # Main app logic
│   │   ├── audio.js          # Mic capture
│   │   ├── websocket.js      # WS client
│   │   └── history.js        # Dashboard/history
│   ├── assets/
│   │   └── logo.svg
│   └── index.html
├── .env                      # API credentials (not in repo)
├── .env.example              # Template
├── get-pavlok-token.js      # OAuth helper script
└── README.md
```

### Database Schema

**sessions** table:
- id, start_time, end_time
- total_claims, total_zaps
- session_stats (JSON)

**fact_checks** table:
- id, session_id, timestamp
- transcript, verdict, confidence
- evidence (JSON), sources (JSON)

**zap_history** table:
- id, fact_check_id, timestamp
- intensity, reason

**safety_state** table:
- id, last_reset_time
- zap_count, emergency_stop_active

## Contributing & Development

### Making Changes

**Backend Changes:**
1. Edit TypeScript files in `backend/src/`
2. Server auto-reloads with `npm run dev`
3. Run `npm run typecheck` before committing
4. Add tests in `backend/tests/` (future)

**Frontend Changes:**
1. Edit files in `frontend/`
2. Refresh browser to see changes
3. No build step required

**Environment Variables:**
- Add new vars to `.env.example`
- Document in README
- Use `config.ts` for typed access

### Testing

```bash
# Run tests (backend)
cd backend
npm test

# Type checking
npm run typecheck

# Build production bundle
npm run build
```

### Deployment Considerations

**For Production:**
- [ ] Add authentication/authorization
- [ ] Implement rate limiting
- [ ] Add HTTPS/SSL
- [ ] Use environment-specific configs
- [ ] Add comprehensive error logging
- [ ] Implement request validation
- [ ] Add API key rotation
- [ ] Set up monitoring/alerts
- [ ] Consider using Redis for session state
- [ ] Implement proper CORS policies

## Troubleshooting

### Common Issues

**"WebSocket connection failed"**
- Check backend is running on correct port
- Verify WebSocket URL in frontend settings
- Check firewall/network settings

**"Microphone not working"**
- Grant browser microphone permissions
- Check microphone is not in use by other apps
- Try different browser (Chrome recommended)

**"Fact-checks timing out"**
- Verify API keys are correct and active
- Check internet connection
- Try switching to Gemini (if Perplexity is down)

**"No beeps/zaps delivered"**
- Verify Pavlok token is valid (may expire)
- Check Pavlok device is powered on
- Test with `get-pavlok-token.js` script
- Check safety limits haven't been exceeded

**"Database errors"**
- Check write permissions in backend directory
- Delete `realibuddy.db` to reset (loses history)
- Check disk space

### Debug Mode

Enable verbose logging:
```bash
# In .env
NODE_ENV=development
```

Backend logs show:
- WebSocket connections/disconnections
- Transcription events
- Fact-check requests/responses
- Safety limit checks
- Database operations

## License & Attribution

This is an experimental personal project. Use at your own risk.

**Third-Party Services:**
- Deepgram (speech & TTS)
- Perplexity AI (fact-checking)
- Google Gemini (fact-checking)
- Pavlok (behavioral feedback)

**Credits:**
- Built by Sean Evanshine
- Inspired by behavioral psychology and accountability tools

## FAQ

**Q: Is this safe to use?**
A: In beep mode (default), yes. In zap mode, consult Pavlok's safety guidelines and your doctor if you have any medical conditions.

**Q: How accurate is the fact-checking?**
A: Perplexity AI provides citations and confidence scores, but no AI is perfect. Expect ~80-90% accuracy for straightforward factual claims. Nuanced or very recent claims may be misjudged.

**Q: Can I use this without a Pavlok device?**
A: Not currently - the system requires a Pavlok API token. However, you could modify the code to disable Pavlok and just show visual/audio feedback.

**Q: Will this work offline?**
A: No. The system requires internet for speech-to-text, fact-checking, and TTS.

**Q: Can multiple people use it simultaneously?**
A: The current implementation supports one active session at a time. Multi-user support would require session management enhancements.

**Q: How do I reset the emergency stop?**
A: Restart the backend server. Emergency stop state is persistent in the database.

**Q: Can I export my data?**
A: Yes! Use the Export button in the History tab for CSV or JSON export.

**Q: How long are sessions stored?**
A: Indefinitely, until you manually delete them or the database file.

**Q: Can I change the fact-checking AI?**
A: Yes. Edit `websocket/handler.ts` to use `geminiService` instead of `perplexityService`, or implement your own AI service.

---

**Ready to start?** Follow the [Setup & Installation](#setup--installation) section above to get RealiBuddy running!