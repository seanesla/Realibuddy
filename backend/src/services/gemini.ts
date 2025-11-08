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
            // Configure Google Search retrieval for fact-checking
            const retrievalTool = {
                googleSearchRetrieval: {
                    dynamicRetrievalConfig: {
                        mode: DynamicRetrievalConfigMode.MODE_DYNAMIC,
                        dynamicThreshold: 0.7  // Only search if confidence > 70%
                    }
                }
            };

            const systemPrompt = `You are a fact-checking assistant. Analyze the following statement and determine if it contains verifiable factual claims.

Instructions:
1. If the statement is subjective, an opinion, or a question, return "unverifiable"
2. If it contains factual claims, verify them using web search
3. Return your verdict as "true", "false", or "unverifiable"
4. Provide a confidence score from 0.0 to 1.0
5. Include brief evidence with sources

Respond ONLY with valid JSON in this exact format:
{
  "verdict": "true" | "false" | "unverifiable",
  "confidence": 0.0-1.0,
  "evidence": "Brief explanation with sources"
}`;

            const response = await this.client.models.generateContent({
                model: 'gemini-2.5-flash',
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
                    tools: [retrievalTool],
                    responseMimeType: 'application/json'
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
