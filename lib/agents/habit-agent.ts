import { callNim } from "@/lib/nim";
import type { Habit, HabitLog } from "@/lib/database";

const MODEL = "meta/llama-3.1-8b-instruct";

export async function getHabitInsight(habits: Habit[], logs: HabitLog[]): Promise<string> {
    if (habits.length === 0) return "Add your first habit to get started.";

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const recentLogs = logs.filter(l => l.completed_at >= thirtyDaysAgo);

    const summary = habits.map(h => {
        const completions = recentLogs.filter(l => l.habit_id === h.id).length;
        return `- ${h.name}: ${completions} completions in last 30 days (streak: ${h.streak})`;
    }).join("\n");

    const result = await callNim(MODEL, [
        {
            role: "system",
            content: "You are a habit coach. Given habit data, return ONE short encouraging insight or nudge (max 20 words). No preamble, no markdown, just the insight."
        },
        {
            role: "user",
            content: `My habits:\n${summary}`
        }
    ]);

    return result?.choices?.[0]?.message?.content?.trim() ?? "Consistency is the key to habit formation.";
}
