# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**RealiBuddy** is a web-based real-time lie detector that:
- Monitors speech via browser microphone
- Streams audio to Deepgram API for sub-300ms speech-to-text
- Uses Google Gemini API to extract and verify factual claims against web sources
- Triggers Pavlok API v5 to deliver electric shocks when lies are detected

Architecture: WebSocket-based bidirectional communication between browser frontend and Node.js/Python backend orchestrating external APIs.

## API Documentation

**IMPORTANT:** Full API documentation with endpoints, parameters, code examples, and implementation details is in `.claude/docs/`:
- `gemini.json` - Complete Gemini API reference (function calling, web search retrieval, streaming, structured JSON output, rate limits, pricing)
- `deepgram.json` - Complete Deepgram API reference (real-time STT/TTS WebSocket specs, latency, audio encoding, message types, concurrent limits)
- `pavlok.json` - Complete Pavlok API v5 reference (stimulus endpoints, authentication, integrations, constraints)

Always refer to these files for complete API specifications, request/response formats, and working code examples.

## Critical Implementation Notes

### Gemini API
- Web search: Use `google_search_retrieval` tool with `dynamic_threshold: 0.7`
- Streaming: `generate_content_stream` (Python) or `generateContentStream` (JavaScript)
- Function calling: Supports compositional multi-step function chains
- Structured output: JSON mode via `response_mime_type` and `response_json_schema`

### Deepgram API
- Real-time STT: WebSocket at `wss://api.deepgram.com/v1/listen`
- Sub-300ms latency with Nova model
- Audio: `linear16` encoding, `16000` Hz for microphone input
- Enable `interim_results: true` for continuous transcription updates
- Authentication: `Authorization: Token YOUR_DEEPGRAM_API_KEY`

### Pavlok API
- Direct API: `POST /api/v5/stimulus/send` with `stimulusType` (zap/beep/vibe) and `stimulusValue` (1-100)
- MCP integration via Zapier: `mcp__zapier__pavlok_wearable_device_*` tools (zap, beep, vibrate, send_song)
- Intensity range: 1-100 (API constraint, not 0-255)

## MCP Integrations

**chrome-devtools**: Browser automation and debugging (page navigation, snapshots, screenshots, element interaction, network/console inspection, performance tracing)

**context7**: Live documentation retrieval for libraries (use `resolve-library-id` then `get-library-docs`)

**zapier**: Pavlok device control via `mcp__zapier__pavlok_wearable_device_*` tools

### Safety Features
- Maximum 10 zaps per hour
- 5-second cooldowns between zaps
- Emergency stop button required
