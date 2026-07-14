import { callNim } from "@/lib/nim";
import type { Goal, Milestone } from "@/lib/database";

const MODEL = "meta/llama-3.1-70b-instruct";

export async function getGoalsInsight(goals: Goal[], milestones: Milestone[]): Promise<string> {
    const activeGoals = goals.filter((g) => g.status === "active");
    if (activeGoals.length === 0) return "Set your first goal to get projections.";

    const summary = activeGoals.map((g) => {
        const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
        const goalMilestones = milestones.filter((m) => m.goal_id === g.id);
        const achieved = goalMilestones.filter((m) => m.status === "achieved").length;
        return [
            `Goal: ${g.title}`,
            `Progress: $${g.current_amount} / $${g.target_amount} (${pct}%)`,
            g.deadline ? `Deadline: ${g.deadline}` : "No deadline",
            `Milestones: ${achieved}/${goalMilestones.length} achieved`,
        ].join(", ");
    }).join("\n");

    const result = await callNim(MODEL, [
        {
            role: "system",
            content: "You are a goals coach. Given active goals, return ONE pace projection for the most notable goal, e.g. \"At current pace, you'll hit X by Y\" style (max 25 words). No preamble, no markdown, just the projection.",
        },
        {
            role: "user",
            content: summary,
        },
    ]);

    return result?.choices?.[0]?.message?.content?.trim() ?? "Keep making progress toward your goals.";
}
