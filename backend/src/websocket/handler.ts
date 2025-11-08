import { WebSocket } from 'ws';
import { DeepgramService } from '../services/deepgram.js';
import { PerplexityService } from '../services/perplexity.js';
import { PavlokService } from '../services/pavlok.js';
import { SafetyManager } from '../services/safety.js';
import { BASE_ZAP_INTENSITY } from '../utils/config.js';

interface ClientMessage {
    type: 'audio_chunk' | 'start_monitoring' | 'stop_monitoring' | 'emergency_stop' | 'text_input';
    data?: ArrayBuffer;
    baseIntensity?: number;
    text?: string;
    timestamp?: number;
}

interface ServerMessage {
    type: 'transcript_interim' | 'transcript_final' | 'fact_check_started' | 'fact_check_result' | 'zap_delivered' | 'safety_status' | 'error' | 'success';
    [key: string]: unknown;
}

export function handleWebSocketConnection(ws: WebSocket, safetyManager: SafetyManager) {
    let deepgramService: DeepgramService | null = null;
    const perplexityService = new PerplexityService();
    const pavlokService = new PavlokService();
    let currentBaseIntensity = BASE_ZAP_INTENSITY; // Default from config, can be updated by client

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

                                const result = await perplexityService.checkFact(text);

                                sendMessage(ws, {
                                    type: 'fact_check_result',
                                    claim: text,
                                    verdict: result.verdict,
                                    confidence: result.confidence,
                                    evidence: result.evidence,
                                    citations: result.citations,
                                    sources: result.sources
                                });

                                // Deliver BEEP if it's a lie (using beep for testing, not zap)
                                if (result.verdict === 'false' && safetyManager.canZap()) {
                                    // Calculate intensity: Math.floor(baseIntensity * confidence)
                                    // SAFETY CAP: Never exceed 100
                                    const calculatedIntensity = Math.floor(currentBaseIntensity * result.confidence);
                                    const intensity = Math.min(Math.max(1, calculatedIntensity), 100);

                                    await pavlokService.sendBeep(intensity, `False claim: ${text}`);
                                    safetyManager.recordZap(intensity, text);

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
                    sendMessage(ws, {
                        type: 'success',
                        message: 'Monitoring stopped'
                    });
                }
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

                    const result = await perplexityService.checkFact(message.text);

                    sendMessage(ws, {
                        type: 'fact_check_result',
                        claim: message.text,
                        verdict: result.verdict,
                        confidence: result.confidence,
                        evidence: result.evidence,
                        citations: result.citations,
                        sources: result.sources
                    });

                    // Deliver BEEP if it's a lie (using beep for testing, not zap)
                    if (result.verdict === 'false' && safetyManager.canZap()) {
                        // Calculate intensity: Math.floor(baseIntensity * confidence)
                        // SAFETY CAP: Never exceed 100
                        const calculatedIntensity = Math.floor(currentBaseIntensity * result.confidence);
                        const intensity = Math.min(Math.max(1, calculatedIntensity), 100);

                        await pavlokService.sendBeep(intensity, `False claim: ${message.text}`);
                        safetyManager.recordZap(intensity, message.text);

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
                } catch (error) {
                    console.error('Error during fact-checking:', error);
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
