import { config } from 'dotenv';
import { join } from 'path';

// Load .env from project root (parent of backend directory)
config({ path: join(process.cwd(), '..', '.env') });

/**
 * Loads and validates required environment variables.
 * Throws an error if a required variable is missing.
 */
function getEnvVar(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

// API Keys
export const DEEPGRAM_API_KEY = getEnvVar('DEEPGRAM_API_KEY');
export const GEMINI_API_KEY = getEnvVar('GEMINI_API_KEY');
export const PERPLEXITY_API_KEY = getEnvVar('PERPLEXITY_API_KEY');
export const PAVLOK_API_TOKEN = getEnvVar('PAVLOK_API_TOKEN');

// Server Configuration
export const PORT = process.env.PORT ?? '3001';
export const NODE_ENV = process.env.NODE_ENV ?? 'development';

// Application Configuration
export const BASE_ZAP_INTENSITY = parseInt(process.env.BASE_ZAP_INTENSITY ?? '30', 10);
export const MAX_ZAP_INTENSITY = parseInt(process.env.MAX_ZAP_INTENSITY ?? '80', 10);
export const MAX_ZAPS_PER_HOUR = parseInt(process.env.MAX_ZAPS_PER_HOUR ?? '10', 10);
export const ZAP_COOLDOWN_MS = parseInt(process.env.ZAP_COOLDOWN_MS ?? '5000', 10);