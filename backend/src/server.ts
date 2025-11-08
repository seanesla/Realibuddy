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
