/**
 * Simple WebSocket connection test
 */
import WebSocket from 'ws';

console.log('Testing WebSocket connection to ws://localhost:3001');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
    console.log('✅ WebSocket connected successfully!');

    // Send a test message
    const testMessage = {
        type: 'start_monitoring'
    };
    ws.send(JSON.stringify(testMessage));
    console.log('Sent test message:', testMessage);

    // Close after 2 seconds
    setTimeout(() => {
        console.log('Closing connection...');
        ws.close();
    }, 2000);
});

ws.on('message', (data) => {
    console.log('Received message:', data.toString());
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
    console.log(`Connection closed: ${code} - ${reason}`);
    process.exit(0);
});

// Timeout after 5 seconds
setTimeout(() => {
    console.error('❌ Connection timeout after 5 seconds');
    process.exit(1);
}, 5000);
