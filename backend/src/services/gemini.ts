import { GoogleGenAI, DynamicRetrievalConfigMode } from '@google/genai';
import { GEMINI_API_KEY } from '../utils/config.js';

interface FactCheckResult {
    verdict: 'true' | 'false' | 'unverifiable';
    confidence: number;
    evidence: string;
}

export class GeminiService {
    private client: GoogleGenAI;

    constructor() {
        this.client = new GoogleGenAI({
            apiKey: GEMINI_API_KEY
        });
    }

    async checkFact(claim: string): Promise<FactCheckResult> {
        try {
            // Configure Google Search tool for fact-checking (updated API)
            const searchTool = {
                google_search: {}
            };

            // Get current date/time for context
            const now = new Date();
            const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const currentDateTime = now.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                timeZoneName: 'short'
            });

            const systemPrompt = `You are a highly accurate fact-checking assistant. Your goal is to avoid false positives while catching genuine lies.

CRITICAL CONTEXT:
- Current Date/Time: ${currentDateTime}
- Today's Date (ISO): ${currentDate}
- Today's Date (US format): ${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}

NUANCE HANDLING - BE VERY CAREFUL:
1. **Date/Time Claims**: If someone states today's date, verify it against the current date above. DO NOT mark it false if it matches!
2. **Recent Events**: Use web search for events within the last few months
3. **Subjective Statements**: Personal feelings, opinions, preferences = "unverifiable" (do NOT fact-check "I love you")
4. **Questions**: All questions = "unverifiable"
5. **Interjections**: "Oh", "Bro", "Motherfucker" = "unverifiable"
6. **Context-Dependent**: "It's working" without context = "unverifiable"
7. **Partial Statements**: Incomplete thoughts = "unverifiable"

FACT-CHECKING RULES:
1. **ALWAYS USE WEB SEARCH** for ANY claim that could be verified online - DO NOT rely on training data alone!
2. **MANDATORY WEB SEARCH** for: current president/leader, election results, current events, people's positions/roles, recent history
3. Only mark as "false" if you are CERTAIN (after web search) the claim is objectively wrong
4. If there's ANY ambiguity after web search, return "unverifiable" instead of guessing
5. For mathematical/scientific facts, verify with authoritative sources
6. Confidence should be <0.7 if there's any uncertainty after web search
7. **CRITICAL**: Your training data has a cutoff. You MUST use web search to verify anything that could have changed since training!
8. **RECENCY WARNING**: For events within the last 7 days, web search may be incomplete. If claim is about very recent events (< 1 week), use lower confidence (<0.6) or return "unverifiable" if sources conflict

SPECIAL HANDLING - CURRENT LEADERS & RECENT EVENTS:
- Claims about "current president", "current prime minister", etc. = MANDATORY web search for latest info
- Do NOT assume training data is current - election results change, people resign, etc.
- **CRITICAL**: ALWAYS append the current date (from CRITICAL CONTEXT above) to search queries for better recency!
  - Current date is: ${currentDateTime}
  - Current month/year is: ${now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
  - Example: Search "NYC mayor 2025 November 8 2025" NOT just "NYC mayor 2025"
  - Example: Search "US president ${now.getFullYear()} ${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}"
  - Example: Search "NYC mayoral election results ${now.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}"
- For elections/appointments in ${now.getFullYear()}: Include "${now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}" or "elected ${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}" in search
- The more specific the date in your search, the better the results!

RESPONSE FORMAT (JSON only):
{
  "verdict": "true" | "false" | "unverifiable",
  "confidence": 0.0-1.0,
  "evidence": "Brief explanation WITH SOURCES (ALWAYS mention if web search was used and what you searched for)"
}

REMEMBER:
- Use web search for EVERYTHING verifiable, not just "current events"
- It's better to return "unverifiable" than to incorrectly zap someone for telling the truth!
- Your training data is OLD - web search is your friend!`;

            const response = await this.client.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: systemPrompt },
                            { text: `\n\nStatement to verify: "${claim}"` }
                        ]
                    }
                ],
                config: {
                    tools: [searchTool],
                    responseMimeType: 'application/json',
                    thinkingConfig: {
                        thinkingBudget: 2048  // Enable extended thinking for better reasoning
                    }
                }
            });

            const responseText = response.text;
            console.log('Gemini response:', responseText);

            // Parse the JSON response
            const result = JSON.parse(responseText);

            // Validate the response structure
            if (!result.verdict || typeof result.confidence !== 'number' || !result.evidence) {
                throw new Error('Invalid response format from Gemini');
            }

            // Ensure verdict is one of the expected values
            if (!['true', 'false', 'unverifiable'].includes(result.verdict)) {
                console.warn(`Unexpected verdict: ${result.verdict}, defaulting to unverifiable`);
                result.verdict = 'unverifiable';
            }

            // Clamp confidence between 0 and 1
            result.confidence = Math.max(0, Math.min(1, result.confidence));

            return result;

        } catch (error) {
            console.error('Error checking fact with Gemini:', error);

            // Return unverifiable on error
            return {
                verdict: 'unverifiable',
                confidence: 0,
                evidence: `Error during fact-check: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}
