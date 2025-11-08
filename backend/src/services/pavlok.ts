import pavlok from '../../../.api/apis/pavlok/index.js';
import { PAVLOK_API_TOKEN } from '../utils/config.js';

export class PavlokService {
    constructor() {
        // Configure SDK with auth token
        pavlok.auth(PAVLOK_API_TOKEN);
    }

    async sendZap(intensity: number, reason: string): Promise<void> {
        try {
            // Validate intensity is in range 1-100
            if (intensity < 1 || intensity > 100) {
                throw new Error(`Invalid zap intensity: ${intensity}. Must be between 1-100.`);
            }

            console.log(`Sending zap: intensity=${intensity}, reason="${reason}"`);

            // Call Pavlok API v5 stimulus endpoint
            const response = await pavlok.stimulus_create_api_v5_stimulus_send_post({
                stimulus: {
                    stimulusType: 'zap',
                    stimulusValue: intensity,
                    reason: reason
                }
            });

            console.log('Zap delivered successfully:', response.data);

        } catch (error) {
            console.error('Error sending zap:', error);
            throw new Error(`Failed to send zap: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
