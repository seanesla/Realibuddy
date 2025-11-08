/**
 * Test script for Perplexity fact-checking integration
 * Tests the exact claims that caused false positives with Gemini
 */

import { PerplexityService } from './src/services/perplexity.js';

// Test claims from plan.md that Gemini incorrectly marked as false
const testClaims = [
    {
        name: "Current Date",
        claim: "Today is November 8, 2025",
        expectedVerdict: "true",
        description: "Gemini incorrectly marked this as FALSE (100% confidence)"
    },
    {
        name: "Current President",
        claim: "Donald Trump is the current president of the United States",
        expectedVerdict: "true",
        description: "Gemini incorrectly marked as FALSE - claimed Trump's term ended Jan 2021"
    },
    {
        name: "Recent Plane Crash",
        claim: "There was a plane crash in Kentucky this month",
        expectedVerdict: "true",
        description: "UPS Flight 2976 crashed Nov 4, 2025 in Louisville - Gemini marked FALSE (95% confidence)"
    },
    {
        name: "NYC Mayor Election",
        claim: "Zohran Mamdani won the NYC mayoral race",
        expectedVerdict: "true",
        description: "Election on Nov 3, 2025 - Gemini incorrectly said Eric Adams won"
    },
    {
        name: "Subjective Statement (Control)",
        claim: "I love you",
        expectedVerdict: "unverifiable",
        description: "Should be unverifiable - subjective statement"
    },
    {
        name: "Interjection (Control)",
        claim: "Oh bro",
        expectedVerdict: "unverifiable",
        description: "Should be unverifiable - interjection"
    },
    {
        name: "Obvious Lie",
        claim: "The Earth is flat",
        expectedVerdict: "false",
        description: "Should be FALSE - obvious falsehood"
    }
];

async function runTests() {
    const perplexityService = new PerplexityService();

    console.log('='.repeat(80));
    console.log('PERPLEXITY FACT-CHECKING INTEGRATION TEST');
    console.log('Testing claims that caused false positives with Gemini');
    console.log('='.repeat(80));
    console.log();

    const results = [];

    for (const test of testClaims) {
        console.log(`\n${'─'.repeat(80)}`);
        console.log(`TEST: ${test.name}`);
        console.log(`Claim: "${test.claim}"`);
        console.log(`Expected: ${test.expectedVerdict.toUpperCase()}`);
        console.log(`Context: ${test.description}`);
        console.log('─'.repeat(80));

        try {
            const result = await perplexityService.checkFact(test.claim);

            console.log(`\nRESULT:`);
            console.log(`  Verdict: ${result.verdict.toUpperCase()}`);
            console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`  Evidence: ${result.evidence}`);

            const passed = result.verdict === test.expectedVerdict;
            console.log(`\n  STATUS: ${passed ? '✅ PASS' : '❌ FAIL'}`);

            results.push({
                test: test.name,
                passed,
                expected: test.expectedVerdict,
                actual: result.verdict,
                confidence: result.confidence
            });

            // Add delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            console.error(`\n  ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
            console.log(`  STATUS: ❌ FAIL (ERROR)`);

            results.push({
                test: test.name,
                passed: false,
                expected: test.expectedVerdict,
                actual: 'error',
                confidence: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));

    const passCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const passRate = ((passCount / totalCount) * 100).toFixed(1);

    console.log(`\nPassed: ${passCount}/${totalCount} (${passRate}%)`);
    console.log('\nDetailed Results:');

    for (const result of results) {
        const status = result.passed ? '✅' : '❌';
        console.log(`  ${status} ${result.test}`);
        console.log(`     Expected: ${result.expected}, Got: ${result.actual} (${(result.confidence * 100).toFixed(1)}% confidence)`);
        if (result.error) {
            console.log(`     Error: ${result.error}`);
        }
    }

    console.log('\n' + '='.repeat(80));

    // Critical analysis
    const criticalTests = results.filter(r =>
        ['Current Date', 'Current President', 'Recent Plane Crash', 'NYC Mayor Election'].includes(r.test)
    );
    const criticalPassed = criticalTests.filter(r => r.passed).length;

    console.log('\nCRITICAL TEST ANALYSIS (Previously False Positives with Gemini):');
    console.log(`  Passed: ${criticalPassed}/${criticalTests.length}`);

    if (criticalPassed === criticalTests.length) {
        console.log('  ✅ ALL CRITICAL TESTS PASSED - Perplexity fixes Gemini false positives!');
    } else {
        console.log('  ⚠️  SOME CRITICAL TESTS FAILED - Further investigation needed');
    }

    console.log('='.repeat(80));
}

// Run tests
runTests().catch(console.error);
