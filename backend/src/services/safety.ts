import { MAX_ZAPS_PER_HOUR, ZAP_COOLDOWN_MS } from '../utils/config.js';
import { getDatabase } from './database.js';

export class SafetyManager {
    private db = getDatabase();
    private emergencyStopActive: boolean;
    private lastZapTime: number;

    constructor() {
        // Load state from database
        this.emergencyStopActive = this.db.getEmergencyStopState();
        this.lastZapTime = this.db.getLastZapTimestamp() || 0;

        console.log('SafetyManager initialized:');
        console.log(`- Emergency stop: ${this.emergencyStopActive}`);
        console.log(`- Last zap: ${this.lastZapTime ? new Date(this.lastZapTime).toISOString() : 'never'}`);
        console.log(`- Zaps in last hour: ${this.getZapsInLastHour()}`);
    }

    /**
     * Check if a zap can be delivered based on safety constraints
     * Returns true only if ALL conditions are met:
     * - Emergency stop is NOT active
     * - Less than MAX_ZAPS_PER_HOUR zaps in the last hour
     * - At least ZAP_COOLDOWN_MS milliseconds since last zap
     */
    canZap(): boolean {
        if (this.emergencyStopActive) {
            console.log('Zap blocked: Emergency stop is active');
            return false;
        }

        const now = Date.now();

        // Check cooldown (5 seconds minimum between zaps)
        if (this.lastZapTime > 0 && (now - this.lastZapTime) < ZAP_COOLDOWN_MS) {
            const remaining = ZAP_COOLDOWN_MS - (now - this.lastZapTime);
            console.log(`Zap blocked: Cooldown active (${Math.ceil(remaining / 1000)}s remaining)`);
            return false;
        }

        // Check hourly limit (10 zaps max per hour)
        const zapsInLastHour = this.getZapsInLastHour();

        if (zapsInLastHour >= MAX_ZAPS_PER_HOUR) {
            console.log(`Zap blocked: Hourly limit reached (${zapsInLastHour}/${MAX_ZAPS_PER_HOUR})`);
            return false;
        }

        return true;
    }

    /**
     * Record a zap delivery with timestamp and claim
     * MUST be called immediately after successful zap delivery
     * Persists to database
     */
    recordZap(intensity: number, claim: string): void {
        const now = Date.now();

        // Save to database
        this.db.recordZap(now, intensity, claim);

        // Update in-memory state
        this.lastZapTime = now;

        const zapCount = this.getZapCount();
        const zapsInHour = this.getZapsInLastHour();
        console.log(`Zap recorded: intensity=${intensity}, total=${zapCount}, last_hour=${zapsInHour}`);
    }

    /**
     * Get number of zaps in the last hour
     */
    getZapsInLastHour(): number {
        return this.db.getZapsInLastHour().length;
    }

    /**
     * Get total number of zaps across all time
     */
    getZapCount(): number {
        return this.db.getAllZaps().length;
    }

    /**
     * Activate emergency stop
     * Disables ALL future zaps until manually reset
     * Persists to database
     */
    emergencyStop(): void {
        this.emergencyStopActive = true;
        this.db.setEmergencyStopState(true);
        console.log('EMERGENCY STOP ACTIVATED - All zaps disabled permanently');
    }

    /**
     * Check if emergency stop is active
     */
    isEmergencyStopped(): boolean {
        return this.emergencyStopActive;
    }

    /**
     * Get time remaining until next zap is allowed (in milliseconds)
     * Returns 0 if cooldown is not active
     */
    getCooldownRemaining(): number {
        if (this.lastZapTime === 0) {
            return 0;
        }
        const elapsed = Date.now() - this.lastZapTime;
        const remaining = ZAP_COOLDOWN_MS - elapsed;
        return Math.max(0, remaining);
    }

    /**
     * Reset emergency stop (for testing/admin use only)
     * NOT exposed via WebSocket - requires server restart or manual DB edit
     */
    resetEmergencyStop(): void {
        this.emergencyStopActive = false;
        this.db.setEmergencyStopState(false);
        console.log('Emergency stop RESET - Zaps re-enabled');
    }

    /**
     * Clear all zap history older than 24 hours (cleanup)
     */
    cleanupOldRecords(): void {
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        this.db.deleteOldZaps(oneDayAgo);
        console.log('Cleaned up zap records older than 24 hours');
    }
}
