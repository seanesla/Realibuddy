import { createClient, type LiveClient, LiveTranscriptionEvents } from '@deepgram/sdk'; // 已修复
import { DEEPGRAM_API_KEY } from '../utils/config.js';
import { logger } from '../utils/logger.js';

/**
 * Deepgram
 * (RealiBuddy Project Plan Spec 2)
 */
const DEEPGRAM_CONFIG = {
    model: 'nova',
    encoding: 'linear16',
    sample_rate: 16000,
    channels: 1,
    interim_results: true,
    punctuate: true,
    smart_format: true,
    endpointing: 300 // 毫秒
};

/**
 * DeepgramService
 *
 * 管理与 Deepgram 的单个实时 WebSocket 连接，
 * 转发音频数据，并处理转录事件。
 */
export class DeepgramService {
    private dgClient = createClient(DEEPGRAM_API_KEY);
    private dgConnection: LiveClient | null = null;
    private readonly onTranscript: (transcript: string, isFinal: boolean) => void;
    private readonly onConnect: () => void;
    private readonly onError: (error: string) => void;

    /**
     * @param onTranscript 当收到 interim 或 final 结果时调用的回调
     * @param onConnect 当 Deepgram 连接打开时调用的回调
     * @param onError 当发生错误时调用的回调
     */
    constructor(
        onTranscript: (transcript: string, isFinal: boolean) => void,
        onConnect: () => void,
        onError: (error: string) => void
    ) {
        this.onTranscript = onTranscript;
        this.onConnect = onConnect;
        this.onError = onError;
    }

    /**
     * 建立与 Deepgram 的连接
     */
    public start(): void {
        try {
            this.dgConnection = this.dgClient.listen.live(DEEPGRAM_CONFIG);
            this.setupListeners();
        } catch (error) {
            logger.error('Failed to create Deepgram connection:', error);
            this.onError('Failed to create Deepgram connection.');
        }
    }

    /**
     * 设置 Deepgram WebSocket 监听器
     */
    private setupListeners(): void {
        if (!this.dgConnection) return;

        // 这里是修复的地方：现在可以正确访问 LiveTranscriptionEvents
        this.dgConnection.on(LiveTranscriptionEvents.Open, () => {
            logger.info('Deepgram connection opened.');
            this.onConnect();
        });

        this.dgConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
            const transcript = data.channel.alternatives[0].transcript;
            if (transcript) {
                this.onTranscript(transcript, data.is_final);
            }
        });

        this.dgConnection.on(LiveTranscriptionEvents.Error, (error) => {
            logger.error('Deepgram error:', error);
            this.onError(error.message || 'Deepgram connection error.');
        });

        this.dgConnection.on(LiveTranscriptionEvents.Close, (event) => {
            logger.info('Deepgram connection closed.', event);
            // WebSocketHandler 将处理清理工作
        });
    }

    /**
     * 向 Deepgram 发送音频数据块
     * @param audioChunk 原始音频数据 (ArrayBuffer)
     */
    public sendAudio(audioChunk: ArrayBuffer): void {
        if (this.dgConnection && this.dgConnection.getReadyState() === 1) { // 1 = OPEN
            this.dgConnection.send(audioChunk);
        }
    }

    /**
     * 优雅地关闭 Deepgram 连接
     */
    public stop(): void {
        if (this.dgConnection) {
            if (this.dgConnection.getReadyState() === 1) {
                logger.info('Closing Deepgram connection.');
                this.dgConnection.finish(); // 发送 'CloseStream'
            }
            this.dgConnection = null;
        }
    }
}