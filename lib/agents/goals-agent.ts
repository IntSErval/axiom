import { callNim } from "@/lib/nim";
import type { Goal, Milestone } from "@/lib/database";
import { formatGoalAmount, type MomentumTemp } from "@/lib/goal-calc";

const MODEL = "meta/llama-3.1-70b-instruct";

export async function getGoalsInsight(
    goals: Goal[],
    milestones: Milestone[],
    momentum: Record<string, MomentumTemp> = {},
): Promise<string> {
    const activeGoals = goals.filter((g) => g.status === "active");
    if (activeGoals.length === 0) return "Set your first goal to get projections.";

    const coldest = activeGoals.find((g) => momentum[g.id] === "cold");

    const summary = activeGoals.map((g) => {
        const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
        const goalMilestones = milestones.filter((m) => m.goal_id === g.id);
        const achieved = goalMilestones.filter((m) => m.status === "achieved").length;
        return [
            `Goal: ${g.title}`,
            `Progress: ${formatGoalAmount(g, g.current_amount)} / ${formatGoalAmount(g, g.target_amount)} (${pct}%)`,
            g.deadline ? `Deadline: ${g.deadline}` : "No deadline",
            `Momentum: ${momentum[g.id] ?? "unknown"}`,
            `Milestones: ${achieved}/${goalMilestones.length} achieved`,
        ].join(", ");
    }).join("\n");

    const system = coldest
        ? `You are a goals coach. One goal ("${coldest.title}") has gone cold. In max 25 words, propose ONE concrete recalibration — push the deadline, lower the target, or break it into a smaller next step. No preamble, no markdown.`
        : "You are a goals coach. Given active goals, return ONE pace projection for the most notable goal, e.g. \"At current pace, you'll hit X by Y\" style (max 25 words). No preamble, no markdown, just the projection.";

    const result = await callNim(MODEL, [
        { role: "system", content: system },
        { role: "user", content: summary },
    ]);

    return result?.choices?.[0]?.message?.content?.trim() ?? "Keep making progress toward your goals.";
}
