/**
 * WebSocket Message Protocol Definitions
 * (RealiBuddy Project Plan Spec 6)
 */

/**
 * Messages sent from the Client (Frontend) to the Server (Backend).
 */
export type ClientMessage =
    | { type: 'audio_chunk'; data: ArrayBuffer }
    | { type: 'emergency_stop' }
    | { type: 'start_monitoring' }
    | { type: 'stop_monitoring' };

/**
 * Messages sent from the Server (Backend) to the Client (Frontend).
 */
export type ServerMessage =
    | { type: 'transcript_interim'; text: string; timestamp: number }
    | { type: 'transcript_final'; text: string; timestamp: number }
    | { type: 'fact_check_result'; claim: string; verdict: string; confidence: number; evidence: string }
    | { type: 'zap_delivered'; intensity: number; reason: string }
    | { type: 'error'; message: string }
    | { type: 'safety_status'; zapCount: number; canZap: boolean }
    | { type: 'info'; message: string }; // Added for general server info/feedback