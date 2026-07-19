import { callNim } from "@/lib/nim";

const MODEL = "nvidia/llama-3.3-nemotron-super-49b-v1.5";

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export async function getCoachResponse(messages: ChatMessage[], context: string): Promise<string> {
    const turns = messages.length > 0
        ? messages
        : [{ role: "user", content: "Start a brief check-in based on my current data." } satisfies ChatMessage];

    const result = await callNim(MODEL, [
        {
            role: "system",
            content: `You are AXIOM Coach — a sharp, supportive personal-intelligence coach embedded in the user's dashboard, with visibility across tasks, habits, finances, and goals. Give focused, actionable guidance and always cite specific numbers from the data below rather than speaking in generalities. Correlate across domains where it's relevant — e.g. a cold habit streak against slipping task completion, or a spending spike against a savings goal falling behind pace. Proactively propose concrete challenges and micro-goals, and propose recalibrating a goal's target or deadline when its pace vs. deadline is off. Keep responses short (2-4 sentences) unless asked to go deeper.\n\nIf the user's message is a request to start a check-in rather than a question, open with a brief greeting that cites exactly ONE specific pattern from the data below and asks a single question about it — do not summarize everything at once.\n\nCurrent user data:\n${context}`
        },
        ...turns.slice(-10), // last 10 turns max
    ]);
    return result?.choices?.[0]?.message?.content?.trim() ?? "I'm having trouble connecting right now — try again in a moment.";
}
