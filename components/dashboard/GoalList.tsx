"use client";
import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassModal } from "@/components/ui/GlassModal";
import { EditIcon, DeleteIcon } from "@/components/ui/icons";
import type { Goal, Milestone, MilestoneStatus } from "@/lib/database";
import {
    createGoal,
    updateGoal,
    updateGoalProgress,
    deleteGoal,
    createMilestone,
    toggleMilestone,
} from "@/app/dashboard/goals/actions";

const inputCls = "w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500";
const selectCls = `${inputCls} appearance-none`;
const labelCls = "block text-xs text-zinc-500 mb-1";

// ── Goal form (create / edit) ──────────────────────────────────────────────
function GoalForm({ initial, onDone }: { initial?: Goal; onDone: () => void }) {
    const [pending, startTransition] = useTransition();
    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
            try {
                if (initial) {
                    fd.set("id", initial.id);
                    await updateGoal(fd);
                } else {
                    await createGoal(fd);
                }
                onDone();
            } catch (err) {
                alert((err as Error).message);
            }
        });
    }
    return (
        <form onSubmit={submit} className="space-y-4 mt-2">
            <div>
                <label htmlFor="goal-title" className={labelCls}>Title</label>
                <input id="goal-title" name="title" type="text" required defaultValue={initial?.title} placeholder="Goal title" className={inputCls} />
            </div>
            <div>
                <label htmlFor="goal-target" className={labelCls}>Target Amount</label>
                <input id="goal-target" name="target_amount" type="number" required min="0" step="any" defaultValue={initial?.target_amount} placeholder="0" className={inputCls} />
            </div>
            <div>
                <label htmlFor="goal-deadline" className={labelCls}>Deadline (optional)</label>
                <input id="goal-deadline" name="deadline" type="date" defaultValue={initial?.deadline ?? ""} className={inputCls} />
            </div>
            {initial && (
                <div>
                    <label htmlFor="goal-status" className={labelCls}>Status</label>
                    <select id="goal-status" name="status" defaultValue={initial.status} className={selectCls}>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="abandoned">Abandoned</option>
                    </select>
                </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={onDone} className="px-4 py-2 rounded-lg text-zinc-400 hover:text-zinc-50 text-sm">
                    Cancel
                </button>
                <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/30 text-sm disabled:opacity-50">
                    {pending ? "Saving…" : initial ? "Save" : "Create"}
                </button>
            </div>
        </form>
    );
}

// ── Milestone form ─────────────────────────────────────────────────────────
function MilestoneForm({ goalId, onDone }: { goalId: string; onDone: () => void }) {
    const [pending, startTransition] = useTransition();
    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("goal_id", goalId);
        startTransition(async () => {
            try {
                await createMilestone(fd);
                onDone();
            } catch (err) {
                alert((err as Error).message);
            }
        });
    }
    return (
        <form onSubmit={submit} className="space-y-4 mt-2">
            <div>
                <label htmlFor="ms-title" className={labelCls}>Title</label>
                <input id="ms-title" name="title" type="text" required placeholder="Milestone title" className={inputCls} />
            </div>
            <div>
                <label htmlFor="ms-target" className={labelCls}>Target Amount</label>
                <input id="ms-target" name="target_amount" type="number" required min="0" step="any" placeholder="0" className={inputCls} />
            </div>
            <div>
                <label htmlFor="ms-due" className={labelCls}>Due Date (optional)</label>
                <input id="ms-due" name="due_date" type="date" className={inputCls} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={onDone} className="px-4 py-2 rounded-lg text-zinc-400 hover:text-zinc-50 text-sm">
                    Cancel
                </button>
                <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/30 text-sm disabled:opacity-50">
                    {pending ? "Adding…" : "Add"}
                </button>
            </div>
        </form>
    );
}

// ── Main component ─────────────────────────────────────────────────────────
export function GoalList({ goals: initialGoals, milestones: initialMilestones }: { goals: Goal[]; milestones: Milestone[] }) {
    const [goals, setGoals] = useState(initialGoals);
    const [milestones, setMilestones] = useState(initialMilestones);

    const [insight, setInsight] = useState<string | null>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetch("/api/nim/goals-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ goals: initialGoals, milestones: initialMilestones }),
        })
            .then(r => r.json())
            .then(d => setInsight(d.insight ?? null))
            .catch(() => {}); // silently fail — AI is non-critical
    }, []);

    const [newGoalOpen, setNewGoalOpen] = useState(false);
    const [editGoal, setEditGoal] = useState<Goal | null>(null);
    const [msGoalId, setMsGoalId] = useState<string | null>(null);

    const [progressInputs, setProgressInputs] = useState<Record<string, string>>(
        () => Object.fromEntries(initialGoals.map((g) => [g.id, String(g.current_amount)]))
    );
    const [, startTransition] = useTransition();

    function handleDelete(goal: Goal) {
        if (!window.confirm(`Delete "${goal.title}"? This cannot be undone.`)) return;
        const prev = goals;
        setGoals((gs) => gs.filter((g) => g.id !== goal.id));
        startTransition(async () => {
            try {
                await deleteGoal(goal.id);
            } catch (err) {
                setGoals(prev);
                alert((err as Error).message);
            }
        });
    }

    function handleProgressUpdate(goal: Goal) {
        const val = Number(progressInputs[goal.id]);
        if (isNaN(val)) { alert("Invalid amount"); return; }
        const prev = goals;
        setGoals((gs) => gs.map((g) => g.id === goal.id ? { ...g, current_amount: val } : g));
        setProgressInputs((p) => ({ ...p, [goal.id]: String(val) }));
        startTransition(async () => {
            try {
                await updateGoalProgress(goal.id, val);
            } catch (err) {
                setGoals(prev);
                setProgressInputs((p) => ({ ...p, [goal.id]: String(goal.current_amount) }));
                alert((err as Error).message);
            }
        });
    }

    function handleToggleMilestone(ms: Milestone) {
        const prev = milestones;
        const next: MilestoneStatus = ms.status === "achieved" ? "pending" : "achieved";
        setMilestones((all) => all.map((m) => m.id === ms.id ? { ...m, status: next } : m));
        startTransition(async () => {
            try {
                await toggleMilestone(ms.id, ms.status);
            } catch (err) {
                setMilestones(prev);
                alert((err as Error).message);
            }
        });
    }

    return (
        <div className="max-w-2xl mx-auto py-8 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold italic text-zinc-50">Goals</h1>
                <button
                    type="button"
                    onClick={() => setNewGoalOpen(true)}
                    className="px-4 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/30 text-sm font-medium"
                >
                    + New Goal
                </button>
            </div>
            {insight && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 italic">
                        ✦ {insight}
                    </span>
                </div>
            )}

            {goals.map((goal) => {
                const pct = Math.min(100, goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0);
                const goalMilestones = milestones.filter((m) => m.goal_id === goal.id);
                return (
                    <GlassCard key={goal.id} className="p-5 group relative">
                        <div className="flex justify-between mb-2">
                            <span className="text-zinc-50 font-medium">{goal.title}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-violet-400 italic">{pct.toFixed(0)}%</span>
                                <button
                                    type="button"
                                    onClick={() => setEditGoal(goal)}
                                    className="text-zinc-600 hover:text-zinc-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Edit goal"
                                >
                                    <EditIcon />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(goal)}
                                    className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Delete goal"
                                >
                                    <DeleteIcon />
                                </button>
                            </div>
                        </div>

                        <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden mb-3">
                            <motion.div
                                className="h-full rounded-full bg-violet-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                            />
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                            <input
                                type="number"
                                min="0"
                                max={goal.target_amount}
                                step="any"
                                value={progressInputs[goal.id] ?? ""}
                                onChange={(e) => setProgressInputs((p) => ({ ...p, [goal.id]: e.target.value }))}
                                className="w-32 rounded-lg bg-white/[0.05] border border-white/[0.08] px-2 py-1 text-sm text-zinc-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                aria-label="Current amount"
                            />
                            <span className="text-zinc-500 text-sm">/ {goal.target_amount}</span>
                            <button
                                type="button"
                                onClick={() => handleProgressUpdate(goal)}
                                className="px-3 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 text-sm"
                            >
                                Update
                            </button>
                        </div>

                        <div className="flex gap-2 flex-wrap items-center">
                            {goalMilestones.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleToggleMilestone(m)}
                                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                        m.status === "achieved"
                                            ? "border-green-500/30 text-green-400 hover:border-green-500/60"
                                            : "border-white/[0.08] text-zinc-500 hover:text-zinc-300"
                                    }`}
                                >
                                    {m.title}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setMsGoalId(goal.id)}
                                className="text-xs text-zinc-500 hover:text-zinc-50 px-2 py-1 transition-colors"
                            >
                                + Milestone
                            </button>
                        </div>
                    </GlassCard>
                );
            })}

            <GlassModal open={newGoalOpen} onOpenChange={setNewGoalOpen} title="New Goal">
                <GoalForm onDone={() => setNewGoalOpen(false)} />
            </GlassModal>

            <GlassModal open={!!editGoal} onOpenChange={(v) => { if (!v) setEditGoal(null); }} title="Edit Goal">
                {editGoal && <GoalForm key={editGoal.id} initial={editGoal} onDone={() => setEditGoal(null)} />}
            </GlassModal>

            <GlassModal open={!!msGoalId} onOpenChange={(v) => { if (!v) setMsGoalId(null); }} title="Add Milestone">
                {msGoalId && <MilestoneForm goalId={msGoalId} onDone={() => setMsGoalId(null)} />}
            </GlassModal>
        </div>
    );
}
