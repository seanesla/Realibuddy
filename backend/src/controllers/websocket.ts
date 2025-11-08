import { WebSocket, type RawData } from 'ws';
import { logger } from '../utils/logger.js';
import type { ClientMessage, ServerMessage } from '../types/index.js';
import { DeepgramService } from '../services/deepgram.js';

/**
 * Handles all logic for an individual WebSocket connection.
 */
export class WebSocketHandler {
    private ws: WebSocket;
    private isAlive = true;
    private deepgramService: DeepgramService | null = null;

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
        // (Phase 3) 路由二进制音频数据
        if (Buffer.isBuffer(data)) {
            if (this.deepgramService) {
                // --- 修复在这里 ---
                // new Uint8Array(data) 从 Node.js Buffer 创建一个副本 (copy)。
                // .buffer 属性是这个新副本的 ArrayBuffer，
                // 它保证是 'ArrayBuffer' 类型，而不是 'SharedArrayBuffer'。
                const arrayBuffer = new Uint8Array(data).buffer;
                this.deepgramService.sendAudio(arrayBuffer);
                // --- 修复结束 ---
            }
            return;
        }

        try {
            const messageStr = data.toString();
            const message: ClientMessage = JSON.parse(messageStr);

            logger.debug('Received message:', message);

            switch (message.type) {
                case 'start_monitoring':
                    // (Phase 3) 初始化 Deepgram 连接
                    logger.info('Monitoring started by client.');
                    this.initializeDeepgram();
                    break;
                case 'stop_monitoring':
                    // (Phase 3) 关闭 Deepgram 连接
                    logger.info('Monitoring stopped by client.');
                    if (this.deepgramService) {
                        this.deepgramService.stop();
                        this.deepgramService = null;
                    }
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
     * (Phase 3) 初始化并启动 Deepgram 服务。
     */
    private initializeDeepgram(): void {
        if (this.deepgramService) {
            logger.warn('Deepgram service already initialized.');
            return;
        }

        // 1. 定义 DeepgramService 需要的回调
        const onTranscript = (transcript: string, isFinal: boolean): void => {
            const messageType = isFinal ? 'transcript_final' : 'transcript_interim';
            this.send({
                type: messageType,
                text: transcript,
                timestamp: Date.now()
            });

            // (Phase 4 占位符) 如果是 final，我们将在这里触发事实核查
            // if (isFinal && transcript.length > 0) {
            //     this.lieDetector.check(transcript);
            // }
        };

        const onConnect = (): void => {
            this.send({
                type: 'info',
                message: 'Speech-to-text connected.'
            });
        };

        const onError = (error: string): void => {
            this.sendError(`Speech-to-text error: ${error}`);
        };

        // 2. 创建并启动服务
        this.deepgramService = new DeepgramService(onTranscript, onConnect, onError);
        this.deepgramService.start();
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

        // (Phase 3) 确保 Deepgram 流被终止
        if (this.deepgramService) {
            this.deepgramService.stop();
            this.deepgramService = null;
        }

        // TODO (Phase 5): 确保 SafetyControllers 被终止

        logger.info('Cleaning up WebSocket resources.');
    }
}