import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3001';

async function testWebSocketConnection() {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        let receivedSuccess = false;

        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket timeout'));
        }, 10000);

        ws.on('open', () => {
            console.log('\n📡 WebSocket connected');

            // Start monitoring
            ws.send(JSON.stringify({
                type: 'start_monitoring',
                baseIntensity: 50
            }));
        });

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data);

                if (msg.type === 'success') {
                    console.log(`✓ ${msg.message}`);
                    receivedSuccess = true;
                }

                if (msg.type === 'safety_status') {
                    console.log(`✓ Safety status received: ${msg.zapCount} zaps, canZap: ${msg.canZap}`);
                }

                if (msg.type === 'fact_check_result') {
                    console.log(`\n✅ Fact-check result received:`);
                    console.log(`   Claim: "${msg.claim}"`);
                    console.log(`   Verdict: ${msg.verdict.toUpperCase()}`);
                    console.log(`   Confidence: ${Math.round(msg.confidence * 100)}%`);
                    console.log(`   Evidence: ${msg.evidence.substring(0, 100)}...`);
                    ws.close();
                    clearTimeout(timeout);
                    resolve(msg);
                }

                if (msg.type === 'error') {
                    console.error(`❌ Error: ${msg.message}`);
                    ws.close();
                    clearTimeout(timeout);
                    reject(new Error(msg.message));
                }
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        });

        ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

async function main() {
    console.log('=== WEBSOCKET PERPLEXITY INTEGRATION TEST ===');

    try {
        await testWebSocketConnection();
        console.log('\n✅ WebSocket integration test PASSED');

    } catch (error) {
        console.error('\n❌ WebSocket test FAILED:', error.message);
        process.exit(1);
    }
}

main();
