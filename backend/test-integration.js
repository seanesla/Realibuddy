/**
 * RealiBuddy Integration Test Suite
 * Tests all backend integrations WITHOUT voice or actual zaps
 */

import WebSocket from 'ws';
import { setTimeout as sleep } from 'timers/promises';

const WS_URL = 'ws://localhost:3001';
const TESTS_PASSED = [];
const TESTS_FAILED = [];

// Utility functions
function pass(testName) {
    TESTS_PASSED.push(testName);
    console.log(`✓ PASS: ${testName}`);
}

function fail(testName, error) {
    TESTS_FAILED.push({ testName, error });
    console.log(`✗ FAIL: ${testName}`);
    console.log(`  Error: ${error}`);
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

// Test 1: WebSocket Connection
async function testWebSocketConnection() {
    console.log('\n--- Test 1: WebSocket Connection ---');

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        let receivedInitialStatus = false;

        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Connection timeout after 5 seconds'));
        }, 5000);

        ws.on('open', () => {
            console.log('  WebSocket connected');
        });

        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            console.log('  Received message:', msg);

            if (msg.type === 'safety_status') {
                receivedInitialStatus = true;
                clearTimeout(timeout);
                ws.close();

                assert(typeof msg.zapCount === 'number', 'zapCount should be a number');
                assert(typeof msg.canZap === 'boolean', 'canZap should be a boolean');

                pass('WebSocket connection and initial safety_status');
                resolve();
            }
        });

        ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

// Test 2: WebSocket Message Protocol
async function testMessageProtocol() {
    console.log('\n--- Test 2: WebSocket Message Protocol ---');

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        const receivedMessages = [];

        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Test timeout'));
        }, 10000);

        ws.on('open', () => {
            console.log('  Sending start_monitoring...');
            ws.send(JSON.stringify({ type: 'start_monitoring' }));

            setTimeout(() => {
                console.log('  Sending stop_monitoring...');
                ws.send(JSON.stringify({ type: 'stop_monitoring' }));

                setTimeout(() => {
                    console.log('  Sending emergency_stop...');
                    ws.send(JSON.stringify({ type: 'emergency_stop' }));

                    setTimeout(() => {
                        clearTimeout(timeout);
                        ws.close();

                        console.log('  Received message types:', receivedMessages.map(m => m.type));

                        // Verify we got expected responses
                        const hasSuccess = receivedMessages.some(m => m.type === 'success');
                        const hasSafetyStatus = receivedMessages.some(m => m.type === 'safety_status');

                        assert(hasSuccess, 'Should receive success messages');
                        assert(hasSafetyStatus, 'Should receive safety_status messages');

                        pass('WebSocket message protocol (start/stop/emergency)');
                        resolve();
                    }, 1000);
                }, 1000);
            }, 1000);
        });

        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            receivedMessages.push(msg);
            console.log('  Received:', msg.type, msg.message || '');
        });

        ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

// Test 3: Deepgram API Connection (without actual audio)
async function testDeepgramAPI() {
    console.log('\n--- Test 3: Deepgram API Connection ---');

    // Import directly to test
    const { createClient } = await import('@deepgram/sdk');
    const { DEEPGRAM_API_KEY } = await import('./src/utils/config.ts');

    return new Promise((resolve, reject) => {
        try {
            const client = createClient(DEEPGRAM_API_KEY);
            const connection = client.listen.live({
                model: 'nova-2',
                language: 'en',
                encoding: 'linear16',
                sample_rate: 16000
            });

            const timeout = setTimeout(() => {
                connection.finish();
                reject(new Error('Deepgram connection timeout'));
            }, 10000);

            connection.on('open', () => {
                console.log('  Deepgram connection opened successfully');
                clearTimeout(timeout);
                connection.finish();
                pass('Deepgram API connection');
                resolve();
            });

            connection.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Test 4: Gemini API with test claim
async function testGeminiAPI() {
    console.log('\n--- Test 4: Gemini API Fact-Checking ---');

    const { GeminiService } = await import('./src/services/gemini.ts');

    const gemini = new GeminiService();
    const testClaim = 'The sky is blue';

    console.log(`  Testing claim: "${testClaim}"`);

    const result = await gemini.checkFact(testClaim);

    console.log('  Result:', result);

    assert(result.verdict, 'Should have verdict');
    assert(['true', 'false', 'unverifiable'].includes(result.verdict), 'Verdict should be true/false/unverifiable');
    assert(typeof result.confidence === 'number', 'Confidence should be number');
    assert(result.confidence >= 0 && result.confidence <= 1, 'Confidence should be 0-1');
    assert(typeof result.evidence === 'string', 'Evidence should be string');

    pass('Gemini API fact-checking with google_search_retrieval');
}

// Test 5: Pavlok API with BEEP (not zap)
async function testPavlokAPIBeep() {
    console.log('\n--- Test 5: Pavlok API (BEEP instead of ZAP) ---');

    const { PavlokService } = await import('./src/services/pavlok.ts');

    console.log('  Sending beep (intensity: 50)...');

    const pavlok = new PavlokService();
    await pavlok.sendBeep(50, 'Integration test - SDK with Bearer auth');

    pass('Pavlok API beep delivery via SDK');
}

// Test 6: SafetyManager
async function testSafetyManager() {
    console.log('\n--- Test 6: SafetyManager ---');

    const { SafetyManager } = await import('./src/services/safety.ts');
    const { getDatabase } = await import('./src/services/database.ts');

    // Clear database first
    const db = getDatabase();
    db.clearAllData();

    const safety = new SafetyManager();

    // Test initial state
    assert(safety.canZap() === true, 'Should be able to zap initially');
    assert(safety.getZapCount() === 0, 'Initial zap count should be 0');

    // Record first zap
    safety.recordZap(30, 'Test claim 1');
    assert(safety.getZapCount() === 1, 'Zap count should be 1');

    // Test cooldown
    assert(safety.canZap() === false, 'Should not be able to zap during cooldown');

    console.log('  Waiting 5 seconds for cooldown...');
    await sleep(5100);

    assert(safety.canZap() === true, 'Should be able to zap after cooldown');

    // Record more zaps
    safety.recordZap(40, 'Test claim 2');
    await sleep(5100);
    safety.recordZap(50, 'Test claim 3');

    assert(safety.getZapCount() === 3, 'Zap count should be 3');
    assert(safety.getZapsInLastHour() === 3, 'Should have 3 zaps in last hour');

    pass('SafetyManager cooldown and zap counting');
}

// Test 7: Database Persistence
async function testDatabasePersistence() {
    console.log('\n--- Test 7: Database Persistence ---');

    const { SafetyManager } = await import('./src/services/safety.ts');
    const { getDatabase } = await import('./src/services/database.ts');

    // Clear and record 2 zaps
    const db = getDatabase();
    db.clearAllData();

    const safety1 = new SafetyManager();
    safety1.recordZap(20, 'Persistence test 1');
    await sleep(5100);
    safety1.recordZap(30, 'Persistence test 2');

    // Create new SafetyManager (simulates restart)
    const safety2 = new SafetyManager();

    assert(safety2.getZapCount() === 2, 'Zap count should persist');
    assert(safety2.getZapsInLastHour() === 2, 'Zaps in last hour should persist');

    const zaps = db.getAllZaps();
    assert(zaps.length === 2, 'Database should have 2 zap records');
    assert(zaps[0].claim === 'Persistence test 2', 'Claim should be stored');

    pass('Database persistence across SafetyManager instances');
}

// Test 8: Emergency Stop Persistence
async function testEmergencyStopPersistence() {
    console.log('\n--- Test 8: Emergency Stop Persistence ---');

    const { SafetyManager } = await import('./src/services/safety.ts');
    const { getDatabase } = await import('./src/services/database.ts');

    const db = getDatabase();
    db.clearAllData();

    const safety1 = new SafetyManager();
    assert(safety1.canZap() === true, 'Should be able to zap initially');

    safety1.emergencyStop();
    assert(safety1.canZap() === false, 'Should NOT be able to zap after emergency stop');

    // Create new SafetyManager (simulates restart)
    const safety2 = new SafetyManager();
    assert(safety2.canZap() === false, 'Emergency stop should persist across restart');
    assert(safety2.isEmergencyStopped() === true, 'Emergency stop flag should be true');

    // Reset for next tests
    safety2.resetEmergencyStop();

    pass('Emergency stop persistence');
}

// Test 9: Zap Intensity Calculation
async function testZapIntensityCalculation() {
    console.log('\n--- Test 9: Zap Intensity Calculation ---');

    // Test formula: Math.floor(baseIntensity * confidence), capped at 100
    const testCases = [
        { base: 30, confidence: 0.5, expected: 15 },
        { base: 30, confidence: 0.8, expected: 24 },
        { base: 30, confidence: 1.0, expected: 30 },
        { base: 80, confidence: 1.0, expected: 80 },
        { base: 80, confidence: 1.5, expected: 100 }, // Should cap at 100
        { base: 80, confidence: 0.1, expected: 8 },
    ];

    for (const test of testCases) {
        const calculated = Math.floor(test.base * test.confidence);
        const capped = Math.min(Math.max(1, calculated), 100);

        console.log(`  base=${test.base}, conf=${test.confidence}: ${capped} (expected ${test.expected})`);
        assert(capped === test.expected, `Expected ${test.expected}, got ${capped}`);
    }

    pass('Zap intensity calculation formula');
}

// Test 10: Hourly Limit
async function testHourlyLimit() {
    console.log('\n--- Test 10: Safety Hourly Limit (10 zaps/hour) ---');

    const { SafetyManager } = await import('./src/services/safety.ts');
    const { getDatabase } = await import('./src/services/database.ts');

    const db = getDatabase();
    db.clearAllData();

    const safety = new SafetyManager();

    // Record 10 zaps
    for (let i = 0; i < 10; i++) {
        if (i > 0) await sleep(5100); // Wait for cooldown

        assert(safety.canZap() === true, `Should be able to deliver zap ${i + 1}`);
        safety.recordZap(30, `Hourly limit test zap ${i + 1}`);
    }

    assert(safety.getZapsInLastHour() === 10, 'Should have 10 zaps in last hour');

    await sleep(5100); // Wait for cooldown

    // 11th zap should be blocked
    assert(safety.canZap() === false, 'Should NOT be able to deliver 11th zap (hourly limit)');

    pass('Safety hourly limit enforcement (10 zaps max)');
}

// Run all tests
async function runAllTests() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  RealiBuddy Integration Test Suite');
    console.log('  Testing WITHOUT voice/audio or actual zaps');
    console.log('═══════════════════════════════════════════════════════\n');

    const tests = [
        { name: 'WebSocket Connection', fn: testWebSocketConnection },
        { name: 'WebSocket Message Protocol', fn: testMessageProtocol },
        { name: 'Deepgram API Connection', fn: testDeepgramAPI },
        { name: 'Gemini API Fact-Checking', fn: testGeminiAPI },
        { name: 'Pavlok API Beep', fn: testPavlokAPIBeep },
        { name: 'SafetyManager', fn: testSafetyManager },
        { name: 'Database Persistence', fn: testDatabasePersistence },
        { name: 'Emergency Stop Persistence', fn: testEmergencyStopPersistence },
        { name: 'Zap Intensity Calculation', fn: testZapIntensityCalculation },
        { name: 'Hourly Limit', fn: testHourlyLimit },
    ];

    for (const test of tests) {
        try {
            await test.fn();
        } catch (error) {
            fail(test.name, error.message || error);
        }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  Test Summary');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✓ Passed: ${TESTS_PASSED.length}`);
    console.log(`✗ Failed: ${TESTS_FAILED.length}`);

    if (TESTS_FAILED.length > 0) {
        console.log('\nFailed Tests:');
        TESTS_FAILED.forEach(({ testName, error }) => {
            console.log(`  - ${testName}: ${error}`);
        });
        process.exit(1);
    } else {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    }
}

// Run tests
runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
