"use client";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Goal, Milestone } from "@/lib/database";

export function GoalList({ goals, milestones }: { goals: Goal[]; milestones: Milestone[] }) {
    return (
        <div className="max-w-2xl mx-auto py-8 space-y-4">
            <h1 className="text-2xl font-bold italic text-zinc-50">Goals</h1>
            {goals.map((goal) => {
                const pct = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
                const goalMilestones = milestones.filter((m) => m.goal_id === goal.id);

                return (
                    <GlassCard key={goal.id} className="p-5">
                        <div className="flex justify-between mb-2">
                            <span className="text-zinc-50 font-medium">{goal.title}</span>
                            <span className="text-violet-400 italic">{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden mb-3">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {goalMilestones.map((m) => (
                                <span
                                    key={m.id}
                                    className={`text-xs px-2 py-1 rounded-full border ${m.status === "achieved" ? "border-green-500/30 text-green-400" : "border-white/[0.08] text-zinc-500"
                                        }`}
                                >
                                    {m.title}
                                </span>
                            ))}
                        </div>
                    </GlassCard>
                );
            })}
        </div>
    );
}