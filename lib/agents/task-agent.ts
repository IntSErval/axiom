import { callNim } from "@/lib/nim";
import type { Task } from "@/lib/database";

const MODEL = "meta/llama-3.1-8b-instruct";

export async function getTaskInsight(tasks: Task[]): Promise<string> {
    if (tasks.length === 0) return "No tasks to analyze.";

    const taskSummary = tasks
        .filter(t => t.status !== "done")
        .slice(0, 10) // cap to avoid token bloat
        .map(t => `- [P${t.priority}] ${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}`)
        .join("\n");

    const result = await callNim(MODEL, [
        {
            role: "system",
            content: "You are a productivity coach. Given a task list, return ONE short actionable insight (max 20 words). No preamble, no markdown, just the insight."
        },
        {
            role: "user",
            content: `My open tasks:\n${taskSummary}`
        }
    ]);

    return result?.choices?.[0]?.message?.content?.trim() ?? "Focus on your highest priority task first.";
}
