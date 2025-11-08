import 'dotenv/config'; // 确保配置最先加载
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws'; // 修正：导入 WebSocket 类型
import cors from 'cors';
import { PORT } from './utils/config.js';
import { logger } from './utils/logger.js';
import { WebSocketHandler } from './controllers/websocket.js';

// --- 设置 Express App ---
const app = express();
app.use(cors()); // 为所有路由启用 CORS
app.use(express.json());

// 健康检查端点
app.get('/health', (req, res) => {
    res.status(200).send({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- 设置 HTTP Server ---
const server = http.createServer(app);

// --- 设置 WebSocket Server ---
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => { // 修正：移除了 'ax' 拼写错误，并添加了 'ws: WebSocket' 类型
    try {
        // 将新连接交给我们的控制器处理
        new WebSocketHandler(ws);
    } catch (error) {
        logger.error('Failed to handle WebSocket connection:', error);
        // 修正：现在 'ws.close' 应该可以正确解析了
        ws.close(1011, 'Internal server error');
    }
});

wss.on('error', (error) => {
    logger.error('WebSocket Server error:', error);
});

// --- 启动 Server ---
server.listen(PORT, () => {
    logger.info(`RealiBuddy Backend Server running on http://localhost:${PORT}`);
    logger.info(`WebSocket Server listening on ws://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received. Shutting down gracefully.');
    server.close(() => {
        logger.info('HTTP server closed.');
        wss.close(() => { // 修正：移除了 'ax' 拼写错误
            logger.info('WebSocket server closed.');
            process.exit(0);
        });
    });
});