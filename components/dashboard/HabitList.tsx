"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassModal } from "@/components/ui/GlassModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
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
    const [confirmDelete, setConfirmDelete] = useState<Habit | null>(null);

    // Re-sync after server actions revalidate (create/edit land in initialHabits)
    useEffect(() => {
        setHabits(initialHabits);
    }, [initialHabits]);

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
                    <GlassCard key={habit.id} className="p-4 group">
                        <div className="flex items-center justify-between">
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
                                    onClick={() => setConfirmDelete(habit)}
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
                        </div>
                        <HabitHeatmap logs={habitLogs} />
                    </GlassCard>
                );
            })}

            <HabitModal
                key={modal.mode === "edit" ? modal.habit.id : modal.mode}
                state={modal}
                onClose={() => setModal({ mode: "closed" })}
            />
            <ConfirmModal
                open={confirmDelete !== null}
                onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}
                title="Delete Habit"
                message={`"${confirmDelete?.name}" and its log history will be permanently deleted. This can't be undone.`}
                onConfirm={async () => {
                    if (!confirmDelete) return;
                    const id = confirmDelete.id;
                    // ponytail: optimistic delete — page revalidates from server anyway
                    setHabits((prev) => prev.filter((h) => h.id !== id));
                    await deleteHabit(id);
                }}
            />
        </div>
    );
}

const MILESTONES = [7, 14, 30, 60, 90];
const HEATMAP_WEEKS = 26;

// GitHub-style contribution grid: columns = weeks, rows = Sun–Sat.
// All date math in UTC to match the app's completed_at convention (toISOString dates).
function HabitHeatmap({ logs }: { logs: HabitLog[] }) {
    const counts = new Map<string, number>();
    for (const l of logs) {
        const d = l.completed_at.slice(0, 10);
        counts.set(d, (counts.get(d) ?? 0) + 1);
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const start = new Date(todayIso + "T00:00:00Z");
    start.setUTCDate(start.getUTCDate() - start.getUTCDay() - (HEATMAP_WEEKS - 1) * 7);

    type Cell = { iso: string; count: number; milestone: number | null; future: boolean };
    const weeks: Cell[][] = [];
    // ponytail: streak runs computed within the fetched window only
    let run = 0;
    let best = 0;
    const cursor = new Date(start);
    for (let w = 0; w < HEATMAP_WEEKS; w++) {
        const week: Cell[] = [];
        for (let d = 0; d < 7; d++) {
            const iso = cursor.toISOString().slice(0, 10);
            const future = iso > todayIso;
            const count = counts.get(iso) ?? 0;
            let milestone: number | null = null;
            if (!future) {
                run = count > 0 ? run + 1 : 0;
                best = Math.max(best, run);
                if (count > 0 && MILESTONES.includes(run)) milestone = run;
            }
            week.push({ iso, count, milestone, future });
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        weeks.push(week);
    }

    const fmt = (iso: string) =>
        new Date(iso + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

    return (
        <div className="mt-4 overflow-x-auto">
            <div className="flex gap-[3px] text-[9px] text-white/30 mb-1">
                {weeks.map((week, i) => {
                    const month = week[0].iso.slice(5, 7);
                    const prevMonth = i > 0 ? weeks[i - 1][0].iso.slice(5, 7) : null;
                    return (
                        <span key={week[0].iso} className="w-[11px] shrink-0 overflow-visible whitespace-nowrap">
                            {month !== prevMonth
                                ? new Date(week[0].iso + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", timeZone: "UTC" })
                                : ""}
                        </span>
                    );
                })}
            </div>
            <div className="flex gap-[3px]">
                {weeks.map((week) => (
                    <div key={week[0].iso} className="flex flex-col gap-[3px]">
                        {week.map((c) => (
                            <div
                                key={c.iso}
                                title={
                                    c.future
                                        ? undefined
                                        : `${fmt(c.iso)}${c.count > 0 ? " — logged" : ""}${c.milestone ? ` · ${c.milestone}-day milestone 🔥` : ""}`
                                }
                                className="h-[11px] w-[11px] shrink-0 rounded-[3px]"
                                style={{
                                    background: c.future
                                        ? "transparent"
                                        : c.count > 0
                                            ? `rgba(141, 166, 255, ${Math.min(0.55 + c.count * 0.2, 1)})`
                                            : "rgba(255, 255, 255, 0.06)",
                                    boxShadow: c.milestone ? "0 0 0 1.5px rgba(240, 200, 120, 0.9)" : undefined,
                                }}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <div className="mt-3 flex items-center gap-1.5">
                <span className="mr-1 text-[10px] uppercase tracking-[0.14em] text-white/30">Milestones</span>
                {MILESTONES.map((m) => (
                    <span
                        key={m}
                        className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                            best >= m
                                ? "border-amber-400/25 bg-amber-400/15 text-amber-300"
                                : "border-white/[0.08] text-white/30"
                        }`}
                    >
                        {m}d
                    </span>
                ))}
            </div>
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
