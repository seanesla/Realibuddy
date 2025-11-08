import { WebSocket, type RawData } from 'ws';
import { logger } from '../utils/logger.js';
import type { ClientMessage, ServerMessage } from '../types/index.js';

/**
 * Handles all logic for an individual WebSocket connection.
 */
export class WebSocketHandler {
    private ws: WebSocket;
    private isAlive = true;

    constructor(ws: WebSocket) {
        this.ws = ws;
        this.setupListeners();
        this.startHeartbeat();

        logger.info('WebSocket connection established.');
        this.send({
            type: 'info',
            message: 'Connection established. Ready to monitor.'
        });
    }

    /**
     * Sets up all event listeners for the WebSocket connection.
     */
    private setupListeners(): void {
        this.ws.on('message', (data: RawData) => {
            this.handleMessage(data);
        });

        this.ws.on('pong', () => {
            this.isAlive = true;
        });

        this.ws.on('close', (code, reason) => {
            logger.info(`WebSocket connection closed. Code: ${code}, Reason: ${reason.toString()}`);
            this.cleanup();
        });

        this.ws.on('error', (error) => {
            logger.error('WebSocket error:', error);
            this.cleanup();
        });
    }

    /**
     * Parses incoming messages and routes them to the correct handler.
     */
    private handleMessage(data: RawData): void {
        // In Phase 3, we will receive audio_chunk as binary data.
        if (Buffer.isBuffer(data)) {
            // TODO (Phase 3): Route binary data (audio_chunk) to Deepgram service
            // logger.debug('Received audio chunk.');
            return;
        }

        try {
            const messageStr = data.toString();
            const message: ClientMessage = JSON.parse(messageStr);

            logger.debug('Received message:', message);

            switch (message.type) {
                case 'start_monitoring':
                    // TODO (Phase 3): Initialize Deepgram connection
                    logger.info('Monitoring started by client.');
                    break;
                case 'stop_monitoring':
                    // TODO (Phase 3): Close Deepgram connection
                    logger.info('Monitoring stopped by client.');
                    break;
                case 'emergency_stop':
                    // TODO (Phase 5): Trigger emergency stop in SafetyController
                    logger.warn('EMERGENCY STOP triggered by client.');
                    this.send({
                        type: 'info',
                        message: 'EMERGENCY STOP engaged. No zaps will be sent.'
                    });
                    break;
                default:
                    logger.warn('Received unknown message type:', (message as any).type);
            }
        } catch (error) {
            logger.error('Failed to parse incoming message:', error, data.toString());
            this.sendError('Invalid message format. Expected JSON.');
        }
    }

    /**
     * Sends a ServerMessage to the client (if the connection is open).
     */
    public send(message: ServerMessage): void {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Sends an error message to the client.
     */
    public sendError(errorMessage: string): void {
        this.send({ type: 'error', message: errorMessage });
    }

    /**
     * Implements a heartbeat (ping/pong) to keep the connection alive
     * and detect disconnected clients.
     */
    private startHeartbeat(): void {
        const interval = setInterval(() => {
            if (!this.isAlive) {
                logger.warn('Client heartbeat failed. Terminating connection.');
                this.ws.terminate();
                return;
            }
            this.isAlive = false;
            this.ws.ping();
        }, 30000); // Ping every 30 seconds

        this.ws.on('close', () => {
            clearInterval(interval);
        });
    }

    /**
     * Cleans up resources when the connection is closed.
     */
    private cleanup(): void {
        this.isAlive = false;
        // TODO (Phase 3/5): Ensure Deepgram streams and SafetyControllers are terminated.
        logger.info('Cleaning up WebSocket resources.');
    }
}