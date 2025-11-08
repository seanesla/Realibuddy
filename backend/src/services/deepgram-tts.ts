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
                    model: 'aura-2',
                    encoding: 'linear16',
                    sample_rate: 16000,
                }
            );

            // Get audio as buffer
            const audioBuffer = await response.getStream();

            // Convert stream to buffer
            const chunks: Buffer[] = [];
            return new Promise((resolve, reject) => {
                if (!audioBuffer) {
                    reject(new Error('No audio stream returned'));
                    return;
                }

                audioBuffer.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                });

                audioBuffer.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });

                audioBuffer.on('error', (error: Error) => {
                    reject(error);
                });
            });
        } catch (error) {
            console.error('Error generating speech:', error);
            throw error;
        }
    }
}

export default DeepgramTTSService;
