import { createClient } from '@deepgram/sdk';

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

if (!deepgramApiKey) {
    throw new Error('DEEPGRAM_API_KEY environment variable is required');
}

export class DeepgramTTSService {
    private deepgram = createClient(deepgramApiKey);

    async generateSpeech(text: string): Promise<Buffer> {
        try {
            const response = await this.deepgram.speak.request(
                {
                    text,
                },
                {
                    model: 'aura-asteria-en',
                    encoding: 'linear16',
                    sample_rate: 16000,
                }
            );

            // The response should be the audio data directly
            if (response instanceof ArrayBuffer) {
                return Buffer.from(response);
            }

            if (Buffer.isBuffer(response)) {
                return response;
            }

            // If it's a stream-like object, convert to buffer
            if (response && typeof response === 'object') {
                const stream = await response.getStream?.();
                if (stream && typeof stream.arrayBuffer === 'function') {
                    const arrayBuffer = await stream.arrayBuffer();
                    return Buffer.from(arrayBuffer);
                }
            }

            throw new Error('Unexpected response type from Deepgram speak API');
        } catch (error) {
            console.error('Error generating speech:', error);
            throw error;
        }
    }
}

export default DeepgramTTSService;
