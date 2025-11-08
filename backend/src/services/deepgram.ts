import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { DEEPGRAM_API_KEY } from '../utils/config.js';

type TranscriptCallback = (text: string, timestamp: number) => void;

export class DeepgramService {
    private client;
    private connection: any = null;
    private onInterimTranscript: TranscriptCallback;
    private onFinalTranscript: TranscriptCallback;

    constructor(
        onInterimTranscript: TranscriptCallback,
        onFinalTranscript: TranscriptCallback
    ) {
        this.client = createClient(DEEPGRAM_API_KEY);
        this.onInterimTranscript = onInterimTranscript;
        this.onFinalTranscript = onFinalTranscript;
    }

    async connect(): Promise<void> {
        try {
            // Create live transcription connection
            this.connection = this.client.listen.live({
                model: 'nova-2',
                language: 'en',
                smart_format: true,
                punctuate: true,
                interim_results: true,
                encoding: 'linear16',
                sample_rate: 16000,
                channels: 1,
                endpointing: 3000  // Wait 3 seconds of silence before finalizing (increased from 2s for natural pauses)
            });

            // Handle connection open
            this.connection.on(LiveTranscriptionEvents.Open, () => {
                console.log('Deepgram connection established');
            });

            // Handle transcription results
            this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
                const transcript = data.channel?.alternatives?.[0]?.transcript;
                if (!transcript) return;

                const isFinal = data.is_final;
                const timestamp = Date.now();

                if (isFinal) {
                    console.log('Final transcript:', transcript);
                    this.onFinalTranscript(transcript, timestamp);
                } else {
                    console.log('Interim transcript:', transcript);
                    this.onInterimTranscript(transcript, timestamp);
                }
            });

            // Handle errors
            this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
                console.error('Deepgram error:', error);
            });

            // Handle connection close
            this.connection.on(LiveTranscriptionEvents.Close, () => {
                console.log('Deepgram connection closed');
            });

            // Handle metadata
            this.connection.on(LiveTranscriptionEvents.Metadata, (metadata: any) => {
                console.log('Deepgram metadata:', metadata);
            });

        } catch (error) {
            console.error('Error connecting to Deepgram:', error);
            throw error;
        }
    }

    sendAudio(audioData: Buffer): void {
        if (this.connection && this.connection.getReadyState() === 1) {
            this.connection.send(audioData);
        } else {
            console.warn('Cannot send audio: Deepgram connection not ready');
        }
    }

    close(): void {
        if (this.connection) {
            this.connection.finish();
            this.connection = null;
            console.log('Deepgram connection closed');
        }
    }
}
