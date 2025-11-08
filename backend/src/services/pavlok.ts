import SDK from '../../../.api/apis/pavlok/index.ts';
import { PAVLOK_API_TOKEN } from '../utils/config.js';

export class PavlokService {
    private sdk: any;

    constructor() {
        // SDK requires TWO parameters for Bearer token: auth('Bearer', token)
        this.sdk = (SDK as any).default?.default || (SDK as any).default || SDK;

        if (typeof this.sdk.auth !== 'function') {
            throw new Error(`SDK.auth is not a function. Check Pavlok SDK import.`);
        }

        // Pavlok API requires "Bearer " prefix despite OpenAPI spec saying apiKey type
        // Pass the full "Bearer <token>" string as single auth parameter
        this.sdk.auth(`Bearer ${PAVLOK_API_TOKEN}`);
    }

    async sendZap(intensity: number, reason: string): Promise<void> {
        return this.sendStimulus('zap', intensity, reason);
    }

    async sendBeep(intensity: number, reason: string): Promise<void> {
        return this.sendStimulus('beep', intensity, reason);
    }

    private async sendStimulus(type: 'zap' | 'beep' | 'vibe', intensity: number, reason: string): Promise<void> {
        try {
            // Validate intensity is in range 1-100
            if (intensity < 1 || intensity > 100) {
                throw new Error(`Invalid ${type} intensity: ${intensity}. Must be between 1-100.`);
            }

            console.log(`Sending ${type}: intensity=${intensity}, reason="${reason}"`);

            // Use Pavlok SDK with proper Bearer token auth
            const response = await this.sdk.stimulus_create_api_v5_stimulus_send_post({
                stimulus: {
                    stimulusType: type,
                    stimulusValue: intensity,
                    reason: reason
                }
            });

            console.log(`${type} delivered successfully:`, response.data);

        } catch (error) {
            console.error(`Error sending ${type}:`, error);
            throw new Error(`Failed to send ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
