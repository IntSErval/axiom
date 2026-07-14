import { callNim } from "@/lib/nim";

const MODEL = "nvidia/llama-3.1-nemotron-70b-instruct";

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export async function getCoachResponse(messages: ChatMessage[], context: string): Promise<string> {
    const result = await callNim(MODEL, [
        {
            role: "system",
            content: `You are AXIOM Coach — a sharp, supportive personal-intelligence coach embedded in the user's dashboard. You can see their current data below. Give focused, actionable guidance. Keep responses short (2-4 sentences) unless asked to go deeper. You may propose challenges, micro-goals, or recalibrations when patterns suggest it.\n\nCurrent user data:\n${context}`
        },
        ...messages.slice(-10), // last 10 turns max
    ]);
    return result?.choices?.[0]?.message?.content?.trim() ?? "I'm having trouble connecting right now — try again in a moment.";
}
