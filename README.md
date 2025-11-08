# Real-Time Lie Detector with Electric Shock Punishment: Project Overview

## What It Is



This is a **real-time personal fact-checking system** that listens to you speak, automatically verifies the truthfulness of your claims, and delivers an electric shock via a Pavlok wearable device whenever you make false statements. It combines speech recognition, AI-powered fact-checking, and behavioral conditioning hardware to create an immediate accountability mechanism for truthfulness.



## Core Concept



The system acts as an automated "truth enforcer" that:

- Continuously monitors your speech through your microphone

- Extracts factual claims from your statements

- Fact-checks those claims against web sources in real-time

- Delivers electric stimulation punishment when lies are detected

- Generates customized "roasts" (humorous insults) to reinforce the correction



## How It Works (Complete Flow)



### 1. **Audio Capture → Speech Recognition**

- Your microphone continuously streams audio to the system

- Deepgram's streaming API transcribes speech to text with <300ms latency

- The system detects natural pauses (1-2 seconds of silence) to segment complete thoughts

- Transcription appears live on screen so you see what's being processed



### 2. **Claim Extraction**

- Claude AI analyzes each transcribed segment

- Identifies statements that contain verifiable facts (vs opinions/feelings)

- Classifies claims by type: statistics, historical facts, current events, etc.

- Filters out subjective statements that can't be fact-checked



### 3. **Fact-Checking**

- Each factual claim is sent to Claude with web search capability

- The AI searches authoritative sources (news, academic papers, government sites)

- Cross-references multiple sources for verification

- Returns a verdict: TRUE, FALSE, MISLEADING, or UNVERIFIABLE

- Includes confidence score (0-100%) and evidence with citations



### 4. **Decision Engine**

- FALSE claims with >70% confidence = LIE → triggers punishment

- MISLEADING claims with >80% confidence = LIE → triggers punishment

- TRUE claims = pass (no action)

- UNVERIFIABLE claims = pass (benefit of the doubt)

- Cooldown period prevents repeated zaps for the same claim



### 5. **Punishment Delivery**

- Pavlok wearable device delivers electric shock (zap)

- Intensity scales based on severity:

  - Minor inaccuracy: 30-50% intensity

  - Clear falsehood: 100-150% intensity (note: actual API uses 1-100 scale)

  - Egregious lie: 200% intensity

- Safety limits: maximum 10 zaps per hour, 5-second cooldown between zaps

- Visual screen flash accompanies the zap



### 6. **Roast Generation**

- Claude generates a witty, sarcastic insult specific to your lie

- Varies style (disappointed parent, snarky friend, game show host, etc.)

- Keeps roasts under 50 words

- Optional text-to-speech reads the roast aloud

- Examples: "Really? You thought we wouldn't fact-check that? The truth hurts less than your credibility right now."



### 7. **User Interface**

- Status indicator: Listening / Processing / Idle

- Live transcription display

- Fact-check log with verdicts (green for TRUE, red for FALSE)

- Zap counter tracking total shocks in the session

- Claim history with expandable evidence

- Settings: sensitivity adjustment, zap intensity control, emergency stop button



## Technology Stack



**Speech Processing:**

- Deepgram Nova-3 API for real-time speech-to-text

- WebSocket streaming for low-latency audio transfer

- 16-bit PCM audio at 16kHz sample rate



**AI/Fact-Checking:**

- Anthropic Claude Sonnet 4.5 with built-in web search

- Extended thinking mode for complex fact verification

- Structured JSON output for reliable data parsing



**Hardware Integration:**

- Pavlok API v5 for electric stimulation

- REST API endpoints (not Bluetooth for simplicity)

- Bearer token OAuth authentication



**Backend:**

- Python 3.12+ with FastAPI, or Node.js 20+ with Express

- WebSocket server for real-time audio streaming

- Request queuing to prevent API overload



**Frontend:**

- Simple web interface (HTML/CSS/JavaScript)

- Browser-based audio capture via WebRTC getUserMedia()

- Real-time status updates and visual feedback



## Key Features



### Core Features (Must-Have)

✅ Real-time speech transcription with <1 second total latency

✅ Automatic claim extraction distinguishing facts from opinions

✅ Multi-source fact-checking with confidence scoring

✅ Electric shock delivery on detected lies

✅ Dynamic roast generation for each violation

✅ Safety limits (max zaps per hour, cooldowns, emergency stop)

✅ Live UI showing transcription and verdicts



### Enhanced Features (If Time Permits)

- Adjustable sensitivity (how strict the fact-checker is)

- Exportable session logs

- Multiple roast personality styles

- Sound effects (buzzer for lies, ding for truth)

- Keyboard shortcuts (space to mute, Esc for emergency stop)



### Configuration

- Three preset modes:

  - **Gentle**: Low sensitivity, low zap intensity

  - **Standard**: Balanced settings

  - **Brutal**: High sensitivity, maximum zap intensity

- Customizable thresholds for what counts as a "lie"

- Adjustable fact-checking confidence requirements



## Development Timeline (10 Hours)



**Hour 0-1:** Environment setup, API credentials, dependencies

**Hour 1-3:** Speech-to-text pipeline with real-time streaming

**Hour 3-5:** Fact-checking engine with claim extraction

**Hour 5-6:** Pavlok integration with safety features

**Hour 6-7:** Roast generation system

**Hour 7-8:** User interface development

**Hour 8-9:** End-to-end testing and bug fixes

**Hour 9-10:** Polish, documentation, final testing



## Use Cases & Applications



**Primary Use Case:**

Personal accountability tool for habitual liars or people who want to break the habit of exaggerating/misrepresenting facts



**Secondary Applications:**

- Debate practice (track accuracy during arguments)

- Sales training (avoid making unsubstantiated claims)

- Educational tool (reinforce fact-checking habits)

- Party game/entertainment (fact-check friends during conversations)

- Podcast/video recording (ensure accuracy during recording)

- Multi-user mode (track who lies more in a group setting)



## Safety & Ethical Considerations



**Medical Contraindications:**

- Do NOT use with pacemakers or heart conditions

- Not recommended for epilepsy or seizure disorders

- Avoid during pregnancy

- Not for users under 18



**Technical Limitations:**

- AI fact-checkers aren't perfect (false positives possible)

- Recent events may not be in training data

- Nuanced claims may be misjudged

- System requires internet connection



**Psychological Considerations:**

- Maximum 1-2 hour sessions (avoid anxiety)

- Remember: tool for improvement, not punishment device

- Take breaks if becoming stressed

- Fact-checking has inherent limitations



**Legal/Privacy:**

- Get consent from anyone you fact-check

- Recording laws vary by jurisdiction

- Pavlok usage is at your own risk



## Technical Advantages



1. **Real-time performance**: Sub-3-second total latency from speech to shock

2. **High accuracy**: Multi-source verification with confidence scoring

3. **Immediate feedback**: Behavioral conditioning works best with instant consequences

4. **Scalable architecture**: Handles continuous speech without crashing

5. **Safety-first design**: Multiple safeguards prevent injury or overuse

6. **Customizable**: Adjustable sensitivity for different accuracy requirements



## Expected Outcomes



After using the system, users should:

- Become more aware of when they make unsupported claims

- Develop habit of verifying information before stating it as fact

- Reduce frequency of exaggerations and misrepresentations

- Improve credibility in conversations

- Gain better understanding of how fact-checking works



## Minimum Viable Product (MVP) Focus



The 10-hour timeline focuses on getting the core loop working:

1. Speak

2. Transcribe

3. Extract claims

4. Fact-check

5. Shock if false

6. Roast



Everything else is polish. The goal is a functional prototype that demonstrates the concept, even if the UI is basic and the fact-checking isn't perfect. Future iterations can add features like better accuracy, mobile apps, team modes, and gamification elements.