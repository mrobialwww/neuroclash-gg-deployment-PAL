import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

/**
 * Exponential backoff retry for Gemini API
 */
export async function generateWithRetry(params: unknown, retries = 3): Promise<unknown> {
    let lastError: unknown = null;
    for (let i = 0; i < retries; i++) {
        try {
            return await ai.models.generateContent(params as Parameters<typeof ai.models.generateContent>[0]);
        } catch (error: unknown) {
            lastError = error;
            const msg = error instanceof Error ? error.message : String(error);
            const isRetryable =
                msg.includes("503") || msg.includes("UNAVAILABLE") ||
                msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
            if (isRetryable && i < retries - 1) {
                const delay = Math.pow(2, i + 1) * 1000;
                console.warn(`[Gemini API] Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
                await new Promise((res) => setTimeout(res, delay));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}
