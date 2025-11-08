import Perplexity from '@perplexity-ai/perplexity_ai';

const client = new Perplexity({
    apiKey: process.env.PERPLEXITY_API_KEY
});

async function testFact(claim) {
    console.log(`\n🔍 Testing: "${claim}"`);
    try {
        const response = await client.chat.completions.create({
            model: "sonar-pro",
            messages: [
                {
                    role: "user",
                    content: `Fact-check this claim: "${claim}". Respond with JSON: {"verdict": "true"|"false"|"unverifiable", "confidence": 0-1, "evidence": "brief explanation"}`
                }
            ]
        });

        const content = response.choices[0].message.content;
        console.log('Response:', content);
        
        if (response.search_results) {
            console.log('Search results found:', response.search_results.length);
            response.search_results.slice(0, 2).forEach((r, i) => {
                console.log(`  ${i+1}. ${r.title} (${r.date})`);
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Test cases that failed with Gemini
console.log('=== PERPLEXITY FACT-CHECKING TEST ===');
await testFact('Today is November 8, 2025');
await testFact('Donald Trump is the current US president');
await testFact('There was a plane crash in Kentucky in November 2025');
await testFact('Zohran Mamdani won the NYC mayoral race');
