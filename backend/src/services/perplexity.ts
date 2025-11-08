import Perplexity from '@perplexity-ai/perplexity_ai';
import { PERPLEXITY_API_KEY } from '../utils/config.js';

interface FactCheckResult {
    verdict: 'true' | 'false' | 'unverifiable';
    confidence: number;
    evidence: string;
    citations?: string[];
    sources?: Array<{
        title: string;
        url: string;
        date?: string;
    }>;
}

export class PerplexityService {
    private client: Perplexity;

    constructor() {
        this.client = new Perplexity({
            apiKey: PERPLEXITY_API_KEY
        });
    }

    async checkFact(claim: string): Promise<FactCheckResult> {
        try {
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
1. **Date/Time Claims**: Verify EXACT dates in claims. "Event happened on DATE X" = FALSE if actual date is different (e.g., "plane crash September 4" is FALSE if it happened November 4)
2. **Specific Details**: If a claim contains specific facts (names, dates, numbers, locations), ALL must be correct for verdict to be TRUE
3. **Recent Events**: You have access to real-time web search - use it for ALL verifiable claims, especially recent events
4. **Subjective Statements**: Personal feelings, opinions, preferences = "unverifiable" (do NOT fact-check "I love you")
5. **Questions**: All questions = "unverifiable"
6. **Interjections**: "Oh", "Bro", "Motherfucker" = "unverifiable"
7. **Context-Dependent**: "It's working" without context = "unverifiable"
8. **Partial Statements**: Incomplete thoughts = "unverifiable"

FACT-CHECKING RULES:
1. **USE WEB SEARCH** for ANY claim that could be verified online
2. **MANDATORY WEB SEARCH** for: current president/leader, election results, current events, people's positions/roles, recent history
3. **COMPONENT FACTS**: Break down complex claims into component facts (date, location, person, event, numbers) - ALL must be correct
4. **Specific Dates**: If claim includes a specific date, verify it's correct. Wrong date = FALSE (even if event is real)
5. Only mark as "false" if you are CERTAIN (after web search) the claim is objectively wrong
6. If there's ANY ambiguity after web search, return "unverifiable" instead of guessing
7. For mathematical/scientific facts, verify with authoritative sources
8. Confidence should be <0.7 if there's any uncertainty after web search
9. **RECENCY ADVANTAGE**: You have access to continuously refreshed web index - use it to verify recent events accurately

SPECIAL HANDLING - CURRENT LEADERS & RECENT EVENTS:
- Claims about "current president", "current prime minister", etc. = MANDATORY web search for latest info
- Election results, appointments, resignations may have happened recently - search for them!
- Include current date context in searches for better recency: "${currentDateTime}"
- For recent events (within last 30 days), prioritize sources with recent publication dates

RESPONSE FORMAT (JSON only):
You MUST respond with ONLY valid JSON in this exact format, no additional text:
{
  "verdict": "true" | "false" | "unverifiable",
  "confidence": 0.0-1.0,
  "evidence": "Brief explanation with sources (mention what you searched for and what sources you found)"
}

REMEMBER:
- Use web search for EVERYTHING verifiable
- It's better to return "unverifiable" than to incorrectly mark truth as false!
- You have access to up-to-date information - use it!
- FALSE POSITIVES ARE WORSE THAN FALSE NEGATIVES when delivering electric shocks!`;

            // Define JSON schema for structured output
            const responseSchema = {
                type: "object" as const,
                properties: {
                    verdict: {
                        type: "string" as const,
                        enum: ["true", "false", "unverifiable"]
                    },
                    confidence: {
                        type: "number" as const,
                        minimum: 0,
                        maximum: 1
                    },
                    evidence: {
                        type: "string" as const
                    }
                },
                required: ["verdict", "confidence", "evidence"]
            };

            const response = await this.client.chat.completions.create({
                model: "sonar-pro",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: `Statement to verify: "${claim}"`
                    }
                ],
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        schema: responseSchema
                    }
                }
            });

            const responseText = response.choices[0].message.content;
            console.log('Perplexity response:', responseText);

            // Capture citations if available
            let citations: string[] = [];
            if ('citations' in response && Array.isArray(response.citations)) {
                citations = response.citations;
                console.log('Citations:', citations);
            }

            // Capture search results if available
            let sources: Array<{ title: string; url: string; date?: string }> = [];
            if ('search_results' in response && Array.isArray(response.search_results)) {
                sources = response.search_results.slice(0, 5).map((r: any) => ({
                    title: r.title || 'Untitled',
                    url: r.url || '',
                    date: r.date
                }));
                console.log('Search results:', sources);
            }

            // Log usage/cost info if available
            if ('usage' in response && response.usage) {
                const usage = response.usage as any;
                console.log('Token usage:', {
                    prompt: usage.prompt_tokens,
                    completion: usage.completion_tokens,
                    total: usage.total_tokens,
                    cost: usage.cost?.total_cost
                });
            }

            // Parse the JSON response
            const result = JSON.parse(responseText);

            // Validate the response structure
            if (!result.verdict || typeof result.confidence !== 'number' || !result.evidence) {
                throw new Error('Invalid response format from Perplexity');
            }

            // Ensure verdict is one of the expected values
            if (!['true', 'false', 'unverifiable'].includes(result.verdict)) {
                console.warn(`Unexpected verdict: ${result.verdict}, defaulting to unverifiable`);
                result.verdict = 'unverifiable';
            }

            // Clamp confidence between 0 and 1
            result.confidence = Math.max(0, Math.min(1, result.confidence));

            // Add citations and sources to result
            if (citations.length > 0) {
                result.citations = citations;
            }
            if (sources.length > 0) {
                result.sources = sources;
            }

            return result;

        } catch (error) {
            console.error('Error checking fact with Perplexity:', error);

            // Return unverifiable on error
            return {
                verdict: 'unverifiable',
                confidence: 0,
                evidence: `Error during fact-check: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}
