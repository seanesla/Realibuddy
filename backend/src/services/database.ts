import Database from 'better-sqlite3';
import { join } from 'path';

export interface ZapRecord {
    id?: number;
    timestamp: number;
    intensity: number;
    claim: string;
}

export interface SafetyState {
    emergency_stop_active: boolean;
}

class DatabaseService {
    private db: Database.Database;

    constructor(dbPath: string = join(process.cwd(), 'realibuddy.db')) {
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.initSchema();
    }

    private initSchema(): void {
        // Create zap_history table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS zap_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                intensity INTEGER NOT NULL,
                claim TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_zap_timestamp ON zap_history(timestamp);
        `);

        // Create safety_state table (single row)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS safety_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                emergency_stop_active INTEGER NOT NULL DEFAULT 0
            );

            INSERT OR IGNORE INTO safety_state (id, emergency_stop_active) VALUES (1, 0);
        `);
    }

    // Zap History Methods
    recordZap(timestamp: number, intensity: number, claim: string): void {
        const stmt = this.db.prepare(`
            INSERT INTO zap_history (timestamp, intensity, claim)
            VALUES (?, ?, ?)
        `);
        stmt.run(timestamp, intensity, claim);
    }

    getZapsInTimeRange(startTime: number, endTime: number): ZapRecord[] {
        const stmt = this.db.prepare(`
            SELECT id, timestamp, intensity, claim
            FROM zap_history
            WHERE timestamp >= ? AND timestamp <= ?
            ORDER BY timestamp DESC
        `);
        return stmt.all(startTime, endTime) as ZapRecord[];
    }

    getZapsInLastHour(): ZapRecord[] {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        return this.getZapsInTimeRange(oneHourAgo, Date.now());
    }

    getAllZaps(): ZapRecord[] {
        const stmt = this.db.prepare(`
            SELECT id, timestamp, intensity, claim
            FROM zap_history
            ORDER BY timestamp DESC
        `);
        return stmt.all() as ZapRecord[];
    }

    getLastZapTimestamp(): number | null {
        const stmt = this.db.prepare(`
            SELECT MAX(timestamp) as last_timestamp
            FROM zap_history
        `);
        const result = stmt.get() as { last_timestamp: number | null };
        return result.last_timestamp;
    }

    // Safety State Methods
    getEmergencyStopState(): boolean {
        const stmt = this.db.prepare(`
            SELECT emergency_stop_active
            FROM safety_state
            WHERE id = 1
        `);
        const result = stmt.get() as { emergency_stop_active: number };
        return result.emergency_stop_active === 1;
    }

    setEmergencyStopState(active: boolean): void {
        const stmt = this.db.prepare(`
            UPDATE safety_state
            SET emergency_stop_active = ?
            WHERE id = 1
        `);
        stmt.run(active ? 1 : 0);
    }

    // Cleanup Methods
    deleteOldZaps(olderThanTimestamp: number): void {
        const stmt = this.db.prepare(`
            DELETE FROM zap_history
            WHERE timestamp < ?
        `);
        stmt.run(olderThanTimestamp);
    }

    clearAllData(): void {
        this.db.exec(`
            DELETE FROM zap_history;
            UPDATE safety_state SET emergency_stop_active = 0 WHERE id = 1;
        `);
    }

    close(): void {
        this.db.close();
    }
}

// Singleton instance
let dbInstance: DatabaseService | null = null;

export function getDatabase(): DatabaseService {
    if (!dbInstance) {
        dbInstance = new DatabaseService();
    }
    return dbInstance;
}

export default DatabaseService;
