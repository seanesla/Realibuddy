import Database from 'better-sqlite3';
import { join } from 'path';

export interface ZapRecord {
    id?: number;
    timestamp: number;
    intensity: number;
    claim: string;
}

export interface Session {
    id?: number;
    start_time: number;
    end_time: number | null;
    total_zaps: number;
    total_claims: number;
    truth_rate: number;
}

export interface FactCheck {
    id?: number;
    session_id: number;
    timestamp: number;
    transcript: string;
    verdict: 'TRUE' | 'FALSE' | 'UNVERIFIABLE' | 'MISLEADING';
    confidence: number;
    evidence: string; // JSON string with citations
    was_zapped: boolean;
    zap_intensity: number | null;
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
        // Create sessions table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                start_time INTEGER NOT NULL,
                end_time INTEGER,
                total_zaps INTEGER NOT NULL DEFAULT 0,
                total_claims INTEGER NOT NULL DEFAULT 0,
                truth_rate REAL NOT NULL DEFAULT 0
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(start_time);
        `);

        // Create fact_checks table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS fact_checks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                transcript TEXT NOT NULL,
                verdict TEXT NOT NULL,
                confidence REAL NOT NULL,
                evidence TEXT,
                was_zapped INTEGER NOT NULL DEFAULT 0,
                zap_intensity INTEGER,
                FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_fact_checks_session ON fact_checks(session_id);
            CREATE INDEX IF NOT EXISTS idx_fact_checks_timestamp ON fact_checks(timestamp);
            CREATE INDEX IF NOT EXISTS idx_fact_checks_verdict ON fact_checks(verdict);
        `);

        // Create zap_history table (legacy, kept for backward compatibility)
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

    // Session Methods
    createSession(startTime: number): number {
        const stmt = this.db.prepare(`
            INSERT INTO sessions (start_time, end_time, total_zaps, total_claims, truth_rate)
            VALUES (?, NULL, 0, 0, 0)
        `);
        const result = stmt.run(startTime);
        return result.lastInsertRowid as number;
    }

    endSession(sessionId: number): void {
        const factChecks = this.getFactChecksBySession(sessionId);
        const totalZaps = factChecks.filter(fc => fc.was_zapped).length;
        const totalClaims = factChecks.length;
        const truthRate = totalClaims > 0
            ? factChecks.filter(fc => fc.verdict === 'TRUE').length / totalClaims
            : 0;

        const stmt = this.db.prepare(`
            UPDATE sessions
            SET end_time = ?, total_zaps = ?, total_claims = ?, truth_rate = ?
            WHERE id = ?
        `);
        stmt.run(Date.now(), totalZaps, totalClaims, truthRate, sessionId);
    }

    getAllSessions(): Session[] {
        const stmt = this.db.prepare(`
            SELECT id, start_time, end_time, total_zaps, total_claims, truth_rate
            FROM sessions
            ORDER BY start_time DESC
        `);
        return stmt.all() as Session[];
    }

    getSession(sessionId: number): Session | null {
        const stmt = this.db.prepare(`
            SELECT id, start_time, end_time, total_zaps, total_claims, truth_rate
            FROM sessions
            WHERE id = ?
        `);
        return stmt.get(sessionId) as Session || null;
    }

    deleteSession(sessionId: number): void {
        const stmt = this.db.prepare(`
            DELETE FROM sessions WHERE id = ?
        `);
        stmt.run(sessionId);
    }

    // Fact Check Methods
    recordFactCheck(sessionId: number, transcript: string, verdict: 'TRUE' | 'FALSE' | 'UNVERIFIABLE' | 'MISLEADING', confidence: number, evidence: string, wasZapped: boolean, zapIntensity: number | null): number {
        const stmt = this.db.prepare(`
            INSERT INTO fact_checks (session_id, timestamp, transcript, verdict, confidence, evidence, was_zapped, zap_intensity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            sessionId,
            Date.now(),
            transcript,
            verdict,
            confidence,
            evidence,
            wasZapped ? 1 : 0,
            zapIntensity
        );
        return result.lastInsertRowid as number;
    }

    getFactChecksBySession(sessionId: number): FactCheck[] {
        const stmt = this.db.prepare(`
            SELECT id, session_id, timestamp, transcript, verdict, confidence, evidence, was_zapped, zap_intensity
            FROM fact_checks
            WHERE session_id = ?
            ORDER BY timestamp DESC
        `);
        const results = stmt.all(sessionId) as Array<any>;
        return results.map(r => ({
            ...r,
            was_zapped: r.was_zapped === 1
        }));
    }

    getFactChecksByVerdict(verdict: 'TRUE' | 'FALSE' | 'UNVERIFIABLE' | 'MISLEADING'): FactCheck[] {
        const stmt = this.db.prepare(`
            SELECT id, session_id, timestamp, transcript, verdict, confidence, evidence, was_zapped, zap_intensity
            FROM fact_checks
            WHERE verdict = ?
            ORDER BY timestamp DESC
        `);
        const results = stmt.all(verdict) as Array<any>;
        return results.map(r => ({
            ...r,
            was_zapped: r.was_zapped === 1
        }));
    }

    getFactChecksByTimeRange(startTime: number, endTime: number): FactCheck[] {
        const stmt = this.db.prepare(`
            SELECT id, session_id, timestamp, transcript, verdict, confidence, evidence, was_zapped, zap_intensity
            FROM fact_checks
            WHERE timestamp >= ? AND timestamp <= ?
            ORDER BY timestamp DESC
        `);
        const results = stmt.all(startTime, endTime) as Array<any>;
        return results.map(r => ({
            ...r,
            was_zapped: r.was_zapped === 1
        }));
    }

    getAllFactChecks(): FactCheck[] {
        const stmt = this.db.prepare(`
            SELECT id, session_id, timestamp, transcript, verdict, confidence, evidence, was_zapped, zap_intensity
            FROM fact_checks
            ORDER BY timestamp DESC
        `);
        const results = stmt.all() as Array<any>;
        return results.map(r => ({
            ...r,
            was_zapped: r.was_zapped === 1
        }));
    }

    deleteFactCheck(factCheckId: number): void {
        const stmt = this.db.prepare(`
            DELETE FROM fact_checks WHERE id = ?
        `);
        stmt.run(factCheckId);
    }

    // Statistics Methods
    getOverallStats(): { totalClaims: number; totalZaps: number; truthRate: number; falseRate: number; unverifiableRate: number } {
        const allChecks = this.getAllFactChecks();
        const totalClaims = allChecks.length;
        const totalZaps = allChecks.filter(fc => fc.was_zapped).length;
        const trueCount = allChecks.filter(fc => fc.verdict === 'TRUE').length;
        const falseCount = allChecks.filter(fc => fc.verdict === 'FALSE').length;
        const unverifiableCount = allChecks.filter(fc => fc.verdict === 'UNVERIFIABLE').length;

        return {
            totalClaims,
            totalZaps,
            truthRate: totalClaims > 0 ? trueCount / totalClaims : 0,
            falseRate: totalClaims > 0 ? falseCount / totalClaims : 0,
            unverifiableRate: totalClaims > 0 ? unverifiableCount / totalClaims : 0
        };
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
            DELETE FROM fact_checks;
            DELETE FROM sessions;
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
