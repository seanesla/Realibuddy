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

            // If it's a SpeakRestClient object with getStream() method
            if (response && typeof response === 'object' && typeof response.getStream === 'function') {
                const stream = await response.getStream();

                // Handle web ReadableStream (from fetch API)
                if (stream && typeof stream.getReader === 'function') {
                    const reader = stream.getReader();
                    const chunks: Uint8Array[] = [];

                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            chunks.push(value);
                        }
                    } finally {
                        reader.releaseLock();
                    }

                    // Concatenate chunks into single buffer
                    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                    const audioBuffer = Buffer.alloc(totalLength);
                    let offset = 0;

                    for (const chunk of chunks) {
                        audioBuffer.set(chunk, offset);
                        offset += chunk.length;
                    }

                    return audioBuffer;
                }

                // Handle Node.js stream with arrayBuffer method
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
