"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassModal } from "@/components/ui/GlassModal";
import { EditIcon, DeleteIcon } from "@/components/ui/icons";
import { computeStreak } from "@/lib/streaks";
import { logHabit, createHabit, updateHabit, deleteHabit } from "@/app/dashboard/habits/actions";
import type { Habit, HabitLog, HabitFrequency } from "@/lib/database";

type ModalState =
    | { mode: "closed" }
    | { mode: "create" }
    | { mode: "edit"; habit: Habit };

export function HabitList({ habits: initialHabits, logs }: { habits: Habit[]; logs: HabitLog[] }) {
    const [habits, setHabits] = useState(initialHabits);
    const [modal, setModal] = useState<ModalState>({ mode: "closed" });
    const [insight, setInsight] = useState<string | null>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetch("/api/nim/habit-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ habits: initialHabits, logs }),
        })
            .then(r => r.json())
            .then(d => setInsight(d.insight ?? null))
            .catch(() => {}); // silently fail — AI is non-critical
    }, []);

    async function handleDelete(habit: Habit) {
        if (!window.confirm(`Delete "${habit.name}"?`)) return;
        // ponytail: optimistic delete — revert on error path not wired; page revalidates from server anyway
        setHabits((prev) => prev.filter((h) => h.id !== habit.id));
        await deleteHabit(habit.id);
    }

    const today = new Date().toISOString().slice(0, 10);

    return (
        <div className="max-w-2xl mx-auto py-8 space-y-3">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold italic text-zinc-50">Habits</h1>
                <button
                    type="button"
                    onClick={() => setModal({ mode: "create" })}
                    className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 text-sm hover:bg-blue-500/30 transition-colors"
                >
                    + New Habit
                </button>
            </div>
            {insight && (
                <div className="mt-3 flex items-center gap-2 text-sm mb-4">
                    <span className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 italic">
                        ✦ {insight}
                    </span>
                </div>
            )}

            {habits.map((habit) => {
                const habitLogs = logs.filter((l) => l.habit_id === habit.id);
                const streak = computeStreak(habitLogs);
                const loggedToday = habitLogs.some((l) => l.completed_at.slice(0, 10) === today);

                return (
                    <GlassCard key={habit.id} className="p-4 flex items-center justify-between group">
                        <div>
                            <p className="text-zinc-50">{habit.name}</p>
                            <p className="text-sm text-zinc-500">
                                {streak > 0 && (
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 12 }}
                                        className="text-amber-400 inline-block"
                                    >
                                        🔥 {streak} day streak
                                    </motion.span>
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    type="button"
                                    onClick={() => setModal({ mode: "edit", habit })}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                                    aria-label="Edit habit"
                                >
                                    <EditIcon />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(habit)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    aria-label="Delete habit"
                                >
                                    <DeleteIcon />
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => logHabit(habit.id)}
                                disabled={loggedToday}
                                className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                            >
                                {loggedToday ? "Logged" : "Log today"}
                            </button>
                        </div>
                    </GlassCard>
                );
            })}

            <HabitModal
                key={modal.mode === "edit" ? modal.habit.id : modal.mode}
                state={modal}
                onClose={() => setModal({ mode: "closed" })}
            />
        </div>
    );
}

function HabitModal({ state, onClose }: { state: ModalState; onClose: () => void }) {
    const isEdit = state.mode === "edit";
    const habit = isEdit ? state.habit : null;

    async function handleSubmit(formData: FormData) {
        if (isEdit) {
            formData.set("id", habit!.id);
            await updateHabit(formData);
        } else {
            await createHabit(formData);
        }
        onClose();
    }

    return (
        <GlassModal
            open={state.mode !== "closed"}
            onOpenChange={(open) => { if (!open) onClose(); }}
            title={isEdit ? "Edit Habit" : "New Habit"}
        >
            <form action={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="habit-name" className="block text-sm text-zinc-500 mb-1">Name</label>
                    <input
                        id="habit-name"
                        name="name"
                        required
                        defaultValue={habit?.name ?? ""}
                        className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g. Morning run"
                    />
                </div>
                <div>
                    <label htmlFor="habit-frequency" className="block text-sm text-zinc-500 mb-1">Frequency</label>
                    <select
                        id="habit-frequency"
                        name="frequency"
                        defaultValue={(habit?.frequency as HabitFrequency) ?? "daily"}
                        className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-50 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="habit-target" className="block text-sm text-zinc-500 mb-1">Target completions per period</label>
                    <input
                        id="habit-target"
                        name="target"
                        type="number"
                        min={1}
                        defaultValue={habit?.target ?? 1}
                        className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-2 pt-2">
                    <button
                        type="submit"
                        className="flex-1 py-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                    >
                        {isEdit ? "Save changes" : "Create habit"}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-white/[0.04] text-zinc-400 border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </GlassModal>
    );
}
