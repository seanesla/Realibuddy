import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import { PORT } from './utils/config.js';
import { handleWebSocketConnection } from './websocket/handler.js';
import { SafetyManager } from './services/safety.js';
import { getDatabase } from './services/database.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Initialize shared services
const db = getDatabase();
const safetyManager = new SafetyManager();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// History API Endpoints
app.get('/api/history/sessions', (_req, res) => {
    try {
        const sessions = db.getAllSessions();
        res.json(sessions);
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

app.get('/api/history/sessions/:id', (req, res) => {
    try {
        const sessionId = parseInt(req.params.id);
        const session = db.getSession(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const factChecks = db.getFactChecksBySession(sessionId);
        res.json({
            session,
            factChecks,
            count: factChecks.length
        });
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

app.get('/api/history/stats', (_req, res) => {
    try {
        const stats = db.getOverallStats();
        const sessions = db.getAllSessions();

        res.json({
            ...stats,
            totalSessions: sessions.length,
            activeSessions: sessions.filter(s => s.end_time === null).length
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

app.delete('/api/history/sessions/:id', (req, res) => {
    try {
        const sessionId = parseInt(req.params.id);
        db.deleteSession(sessionId);

        res.json({ success: true, message: `Session ${sessionId} deleted` });
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

app.get('/api/history/export', (req, res) => {
    try {
        const format = (req.query.format as string) || 'json';
        const sessions = db.getAllSessions();

        if (format === 'csv') {
            // CSV format: session info + fact checks flattened
            let csv = 'Session ID,Start Time,End Time,Total Claims,Total Zaps,Truth Rate,Claim,Verdict,Confidence,Was Zapped\n';

            for (const session of sessions) {
                const factChecks = db.getFactChecksBySession(session.id!);

                if (factChecks.length === 0) {
                    csv += `${session.id},${new Date(session.start_time).toISOString()},${session.end_time ? new Date(session.end_time).toISOString() : ''},${session.total_claims},${session.total_zaps},${session.truth_rate}\n`;
                } else {
                    for (const fc of factChecks) {
                        csv += `${session.id},${new Date(session.start_time).toISOString()},${session.end_time ? new Date(session.end_time).toISOString() : ''},${session.total_claims},${session.total_zaps},${session.truth_rate},"${fc.transcript.replace(/"/g, '""')}",${fc.verdict},${fc.confidence},${fc.was_zapped ? 'YES' : 'NO'}\n`;
                    }
                }
            }

            res.header('Content-Type', 'text/csv');
            res.header('Content-Disposition', 'attachment; filename="realibuddy-history.csv"');
            res.send(csv);
        } else {
            // JSON format
            const exportData = sessions.map(session => ({
                ...session,
                factChecks: db.getFactChecksBySession(session.id!)
            }));

            res.header('Content-Type', 'application/json');
            res.header('Content-Disposition', 'attachment; filename="realibuddy-history.json"');
            res.json(exportData);
        }
    } catch (error) {
        console.error('Error exporting history:', error);
        res.status(500).json({ error: 'Failed to export history' });
    }
});

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection established');
    handleWebSocketConnection(ws, safetyManager);
});

// Start server
server.listen(PORT, () => {
    console.log(`RealiBuddy backend server running on port ${PORT}`);
    console.log(`WebSocket server ready for connections`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
