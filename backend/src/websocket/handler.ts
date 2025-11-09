import { WebSocket } from 'ws';
import { DeepgramService } from '../services/deepgram.js';
import { PerplexityService } from '../services/perplexity.js';
import { PavlokService } from '../services/pavlok.js';
import { SafetyManager } from '../services/safety.js';
import { getDatabase } from '../services/database.js';
import DeepgramTTSService from '../services/deepgram-tts.js';
import { BASE_ZAP_INTENSITY } from '../utils/config.js';

interface ClientMessage {
    type: 'audio_chunk' | 'start_monitoring' | 'stop_monitoring' | 'emergency_stop' | 'text_input';
    data?: ArrayBuffer;
    baseIntensity?: number;
    text?: string;
    timestamp?: number;
    sourceFilter?: 'all' | 'authoritative' | 'news' | 'social' | 'academic';
}

interface ServerMessage {
    type: 'transcript_interim' | 'transcript_final' | 'fact_check_started' | 'fact_check_result' | 'zap_delivered' | 'safety_status' | 'error' | 'success';
    [key: string]: unknown;
}

export function handleWebSocketConnection(ws: WebSocket, safetyManager: SafetyManager) {
    let deepgramService: DeepgramService | null = null;
    const perplexityService = new PerplexityService();
    const pavlokService = new PavlokService();
    const ttsService = new DeepgramTTSService();
    const db = getDatabase();
    let currentBaseIntensity = BASE_ZAP_INTENSITY; // Default from config, can be updated by client
    let currentSessionId: number | null = null; // Track active session

    // Send initial safety status
    sendMessage(ws, {
        type: 'safety_status',
        zapCount: safetyManager.getZapCount(),
        canZap: safetyManager.canZap()
    });

    ws.on('message', async (data: Buffer) => {
        try {
            // Check if message is JSON or binary audio data
            if (data[0] === 0x7B) { // '{' - JSON message
                const message: ClientMessage = JSON.parse(data.toString());
                await handleTextMessage(ws, message, deepgramService, perplexityService, pavlokService, safetyManager);
            } else {
                // Binary audio data
                if (deepgramService) {
                    deepgramService.sendAudio(data);
                }
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            sendMessage(ws, {
                type: 'error',
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
        if (deepgramService) {
            deepgramService.close();
            deepgramService = null;
        }
        // End session if still active
        if (currentSessionId !== null) {
            db.endSession(currentSessionId);
            currentSessionId = null;
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    async function handleTextMessage(
        ws: WebSocket,
        message: ClientMessage,
        deepgramServiceRef: DeepgramService | null,
        perplexityService: PerplexityService,
        pavlokService: PavlokService,
        safetyManager: SafetyManager
    ) {
        // Update baseIntensity if client sends it
        if (message.baseIntensity !== undefined) {
            // Clamp to 10-80 range as per plan.md
            currentBaseIntensity = Math.max(10, Math.min(80, message.baseIntensity));
        }

        switch (message.type) {
            case 'start_monitoring':
                if (!deepgramServiceRef) {
                    // Create a new session
                    currentSessionId = db.createSession(Date.now());
                    console.log(`Session ${currentSessionId} started`);

                    deepgramService = new DeepgramService(
                        // On interim transcript
                        (text: string, timestamp: number) => {
                            sendMessage(ws, {
                                type: 'transcript_interim',
                                text,
                                timestamp
                            });
                        },
                        // On final transcript
                        async (text: string, timestamp: number) => {
                            sendMessage(ws, {
                                type: 'transcript_final',
                                text,
                                timestamp
                            });

                            // Start fact-checking
                            try {
                                sendMessage(ws, {
                                    type: 'fact_check_started',
                                    claim: text
                                });

                                // Use sourceFilter if provided (for voice monitoring, we'll use 'all' by default)
                                const result = await perplexityService.checkFact(text, 'all');

                                sendMessage(ws, {
                                    type: 'fact_check_result',
                                    claim: text,
                                    verdict: result.verdict,
                                    confidence: result.confidence,
                                    evidence: result.evidence,
                                    citations: result.citations,
                                    sources: result.sources
                                });

                                // Generate TTS for verdict + description
                                try {
                                    // Format: "VERDICT. Description"
                                    const verdictText = result.verdict.charAt(0).toUpperCase() + result.verdict.slice(1);
                                    const description = typeof result.evidence === 'string'
                                        ? result.evidence
                                        : (result.evidence as any).description || JSON.stringify(result.evidence);

                                    const ttsText = `${verdictText}. ${description}`;

                                    const audioBuffer = await ttsService.generateSpeech(ttsText);

                                    // Send audio as binary message
                                    ws.send(audioBuffer);
                                } catch (ttsError) {
                                    console.error('Error generating TTS:', ttsError);
                                    // Don't fail the whole fact-check if TTS fails
                                }

                                // Record fact-check to database
                                let wasZapped = false;
                                let zapIntensity: number | null = null;

                                // Deliver BEEP if it's a lie (using beep for testing, not zap)
                                if (result.verdict === 'false' && safetyManager.canZap()) {
                                    // Calculate intensity: Math.floor(baseIntensity * confidence)
                                    // SAFETY CAP: Never exceed 100
                                    const calculatedIntensity = Math.floor(currentBaseIntensity * result.confidence);
                                    const intensity = Math.min(Math.max(1, calculatedIntensity), 100);

                                    await pavlokService.sendBeep(intensity, `False claim: ${text}`);
                                    safetyManager.recordZap(intensity, text);

                                    wasZapped = true;
                                    zapIntensity = intensity;

                                    sendMessage(ws, {
                                        type: 'zap_delivered',
                                        intensity,
                                        reason: `False claim detected (${Math.round(result.confidence * 100)}% confidence)`
                                    });

                                    sendMessage(ws, {
                                        type: 'safety_status',
                                        zapCount: safetyManager.getZapCount(),
                                        canZap: safetyManager.canZap()
                                    });
                                }

                                // Store fact-check in database
                                if (currentSessionId !== null) {
                                    db.recordFactCheck(
                                        currentSessionId,
                                        text,
                                        result.verdict.toUpperCase() as any,
                                        result.confidence,
                                        JSON.stringify(result.evidence),
                                        wasZapped,
                                        zapIntensity
                                    );
                                }
                            } catch (error) {
                                console.error('Error during fact-checking:', error);
                                sendMessage(ws, {
                                    type: 'error',
                                    message: `Fact-checking error: ${error instanceof Error ? error.message : 'Unknown error'}`
                                });
                            }
                        }
                    );

                    await deepgramService.connect();
                    sendMessage(ws, {
                        type: 'success',
                        message: 'Monitoring started'
                    });
                }
                break;

            case 'stop_monitoring':
                if (deepgramService) {
                    deepgramService.close();
                    deepgramService = null;
                }
                // End active session
                if (currentSessionId !== null) {
                    db.endSession(currentSessionId);
                    console.log(`Session ${currentSessionId} ended`);
                    currentSessionId = null;
                }
                sendMessage(ws, {
                    type: 'success',
                    message: 'Monitoring stopped'
                });
                break;

            case 'emergency_stop':
                safetyManager.emergencyStop();
                sendMessage(ws, {
                    type: 'success',
                    message: 'Emergency stop activated - all zaps disabled'
                });
                sendMessage(ws, {
                    type: 'safety_status',
                    zapCount: safetyManager.getZapCount(),
                    canZap: false
                });
                break;

            case 'text_input':
                // Handle text input for fact-checking (without microphone/Deepgram)
                if (!message.text) {
                    sendMessage(ws, {
                        type: 'error',
                        message: 'No text provided'
                    });
                    break;
                }

                // Validate text length (prevent abuse)
                if (message.text.length > 1000) {
                    sendMessage(ws, {
                        type: 'error',
                        message: 'Text too long (max 1000 characters)'
                    });
                    break;
                }

                // Validate sourceFilter (security)
                const validFilters = ['all', 'authoritative', 'news', 'social', 'academic'];
                const sourceFilter = message.sourceFilter || 'all';
                if (!validFilters.includes(sourceFilter)) {
                    sendMessage(ws, {
                        type: 'error',
                        message: `Invalid source filter: ${sourceFilter}`
                    });
                    break;
                }

                // Create a new session for this text input fact-check
                const textSessionId = db.createSession(Date.now());
                console.log(`Text input session ${textSessionId} started`);

                // Send transcript final message
                sendMessage(ws, {
                    type: 'transcript_final',
                    text: message.text,
                    timestamp: message.timestamp || Date.now()
                });

                // Start fact-checking
                try {
                    sendMessage(ws, {
                        type: 'fact_check_started',
                        claim: message.text
                    });
                    const result = await perplexityService.checkFact(message.text, sourceFilter);

                    sendMessage(ws, {
                        type: 'fact_check_result',
                        claim: message.text,
                        verdict: result.verdict,
                        confidence: result.confidence,
                        evidence: result.evidence,
                        citations: result.citations,
                        sources: result.sources
                    });

                    // Track zap status for database recording
                    let wasZapped = false;
                    let zapIntensity: number | null = null;

                    // Deliver BEEP if it's a lie (using beep for testing, not zap)
                    if (result.verdict === 'false' && safetyManager.canZap()) {
                        // Calculate intensity: Math.floor(baseIntensity * confidence)
                        // SAFETY CAP: Never exceed 100
                        const calculatedIntensity = Math.floor(currentBaseIntensity * result.confidence);
                        const intensity = Math.min(Math.max(1, calculatedIntensity), 100);

                        await pavlokService.sendBeep(intensity, `False claim: ${message.text}`);
                        safetyManager.recordZap(intensity, message.text);

                        wasZapped = true;
                        zapIntensity = intensity;

                        sendMessage(ws, {
                            type: 'zap_delivered',
                            intensity,
                            reason: `False claim detected (${Math.round(result.confidence * 100)}% confidence)`
                        });

                        sendMessage(ws, {
                            type: 'safety_status',
                            zapCount: safetyManager.getZapCount(),
                            canZap: safetyManager.canZap()
                        });
                    }

                    // Record fact-check to database
                    db.recordFactCheck(
                        textSessionId,
                        message.text,
                        result.verdict.toUpperCase() as any,
                        result.confidence,
                        JSON.stringify(result.evidence),
                        wasZapped,
                        zapIntensity
                    );

                    // End the session
                    db.endSession(textSessionId);
                    console.log(`Text input session ${textSessionId} ended`);
                } catch (error) {
                    console.error('Error during fact-checking:', error);

                    // End the session even if there was an error
                    db.endSession(textSessionId);
                    console.log(`Text input session ${textSessionId} ended (with error)`);

                    sendMessage(ws, {
                        type: 'error',
                        message: `Fact-checking error: ${error instanceof Error ? error.message : 'Unknown error'}`
                    });
                }
                break;

            default:
                sendMessage(ws, {
                    type: 'error',
                    message: `Unknown message type: ${message.type}`
                });
        }
    }
}

function sendMessage(ws: WebSocket, message: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}
