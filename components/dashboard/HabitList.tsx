"use client";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassModal } from "@/components/ui/GlassModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CheckBox } from "@/components/ui/neu";
import { EditIcon, DeleteIcon } from "@/components/ui/icons";
import { computeStreak } from "@/lib/streaks";
import { logHabit, createHabit, updateHabit, deleteHabit } from "@/app/dashboard/habits/actions";
import type { Habit, HabitLog, HabitFrequency } from "@/lib/database";

type ModalState =
    | { mode: "closed" }
    | { mode: "create" }
    | { mode: "edit"; habit: Habit };

const MILESTONES = [7, 14, 30, 60, 90];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CARD_HOVER =
    "transition-[transform,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] " +
    "hover:-translate-y-[2px] hover:[box-shadow:-10px_-10px_24px_rgba(255,255,255,0.055),13px_13px_30px_rgba(0,0,0,0.62)]";

export function HabitList({ habits: initialHabits, logs: initialLogs }: { habits: Habit[]; logs: HabitLog[] }) {
    const [habits, setHabits] = useState(initialHabits);
    const [logs, setLogs] = useState(initialLogs);
    const [modal, setModal] = useState<ModalState>({ mode: "closed" });
    const [insight, setInsight] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Habit | null>(null);

    // Re-sync after server actions revalidate (create/edit/log land in initial props)
    useEffect(() => {
        setHabits(initialHabits);
    }, [initialHabits]);
    useEffect(() => {
        setLogs(initialLogs);
    }, [initialLogs]);

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
    const doneToday = habits.filter((h) =>
        logs.some((l) => l.habit_id === h.id && l.completed_at.slice(0, 10) === today)
    ).length;

    return (
        <div className="flex flex-col gap-[22px] py-8 [animation:paneIn_320ms_cubic-bezier(0.23,1,0.32,1)_both]">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-[25px] font-semibold tracking-[-0.01em] text-[#eceef3]">Habits</h1>
                    <p className="mt-[3px] text-[13.5px] tabular-nums text-[#868da0]">
                        {doneToday} of {habits.length} done today
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setModal({ mode: "create" })}
                    className="neu-btn px-5 py-3 rounded-[15px] text-[#6fd6c3] text-[13px] font-semibold"
                >
                    + New habit
                </button>
            </div>
            {insight && (
                <div className="self-start inline-flex items-center gap-2 neu-inset px-4 py-2 rounded-[13px] text-[12.5px] italic text-[#6fd6c3]">
                    ✦ {insight}
                </div>
            )}

            {habits.map((habit) => {
                const habitLogs = logs.filter((l) => l.habit_id === habit.id);
                const streak = computeStreak(habitLogs);
                const loggedToday = habitLogs.some((l) => l.completed_at.slice(0, 10) === today);
                const nextMilestone = MILESTONES.find((m) => m > streak) ?? streak + 30;

                // Last 7 days of pips, oldest → today
                const loggedDays = new Set(habitLogs.map((l) => l.completed_at.slice(0, 10)));
                const pips = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    const iso = d.toISOString().slice(0, 10);
                    return { iso, on: loggedDays.has(iso), day: DAYS[d.getDay()], isToday: i === 6 };
                });

                return (
                    <GlassCard key={habit.id} className={`group flex items-center gap-5 rounded-[24px] px-[26px] py-[22px] ${CARD_HOVER}`}>
                        <CheckBox
                            round
                            size={46}
                            done={loggedToday}
                            disabled={loggedToday}
                            label={`Log ${habit.name} today`}
                            onClick={() => {
                                // ponytail: optimistic log — revalidate resyncs the real row via initialLogs effect
                                setLogs((prev) => [...prev, { id: crypto.randomUUID(), habit_id: habit.id, completed_at: today, note: null }]);
                                logHabit(habit.id);
                            }}
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2.5">
                                <span className={`text-[15.5px] font-semibold transition-colors ${loggedToday ? "text-[#9aa1b0]" : "text-[#e3e6ec]"}`}>
                                    {habit.name}
                                </span>
                                <span className="neu-pill rounded-[8px] px-[9px] py-[3px] text-[10.5px] font-semibold tracking-[0.05em] text-[#868da0] capitalize">
                                    {habit.frequency}
                                </span>
                                <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() => setModal({ mode: "edit", habit })}
                                        className="p-1 text-[#868da0] hover:text-[#d3d7e0] transition-colors"
                                        aria-label="Edit habit"
                                    >
                                        <EditIcon />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDelete(habit)}
                                        className="p-1 text-[#868da0] hover:text-[#f2a86f] transition-colors"
                                        aria-label="Delete habit"
                                    >
                                        <DeleteIcon />
                                    </button>
                                </span>
                            </div>
                            <div className="mt-[11px] flex items-center gap-2.5">
                                <div className="neu-inset relative h-[7px] max-w-[220px] flex-1 overflow-hidden rounded-[4px]">
                                    <div
                                        className="absolute inset-y-0 left-0 rounded-[4px] transition-[width] duration-500 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]"
                                        style={{
                                            width: `${Math.round((streak / nextMilestone) * 100)}%`,
                                            background: "linear-gradient(90deg, rgba(111,214,195,0.5), #6fd6c3)",
                                            boxShadow: "0 0 6px rgba(111,214,195,0.35)",
                                        }}
                                    />
                                </div>
                                <span className="whitespace-nowrap text-[11.5px] tabular-nums text-[#868da0]">
                                    {nextMilestone} d in {nextMilestone - streak}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-none flex-col items-end gap-[9px]">
                            <span className="neu-pill whitespace-nowrap rounded-[10px] px-3 py-[5px] text-xs font-semibold tabular-nums text-[#f2a86f]">
                                {streak} day streak
                            </span>
                            <div className="flex gap-1.5">
                                {pips.map((p) => (
                                    <div
                                        key={p.iso}
                                        title={p.day}
                                        className="h-[11px] w-[11px] rounded-full transition-[background,box-shadow] duration-250"
                                        style={{
                                            background: p.on ? (p.isToday ? "#6fd6c3" : "rgba(111,214,195,0.55)") : "rgba(0,0,0,0.28)",
                                            boxShadow: p.on
                                                ? p.isToday ? "0 0 7px rgba(111,214,195,0.5)" : "none"
                                                : "inset 2px 2px 4px rgba(0,0,0,0.4), inset -1px -1px 3px rgba(255,255,255,0.03)",
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
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
                    <label htmlFor="habit-name" className="block text-xs text-[#868da0] mb-1">Name</label>
                    <input
                        id="habit-name"
                        name="name"
                        required
                        defaultValue={habit?.name ?? ""}
                        className="w-full px-3 py-2.5 rounded-[12px] neu-inset border-none text-[#d3d7e0] placeholder:text-[#5c6270] focus:outline-none"
                        placeholder="e.g. Morning run"
                    />
                </div>
                <div>
                    <label htmlFor="habit-frequency" className="block text-xs text-[#868da0] mb-1">Frequency</label>
                    <select
                        id="habit-frequency"
                        name="frequency"
                        defaultValue={(habit?.frequency as HabitFrequency) ?? "daily"}
                        className="w-full px-3 py-2.5 rounded-[12px] neu-inset border-none text-[#d3d7e0] appearance-none focus:outline-none"
                    >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="habit-target" className="block text-xs text-[#868da0] mb-1">Target completions per period</label>
                    <input
                        id="habit-target"
                        name="target"
                        type="number"
                        min={1}
                        defaultValue={habit?.target ?? 1}
                        className="w-full px-3 py-2.5 rounded-[12px] neu-inset border-none text-[#d3d7e0] focus:outline-none"
                    />
                </div>
                <div className="flex gap-2 pt-2">
                    <button
                        type="submit"
                        className="neu-btn flex-1 py-2.5 rounded-[14px] text-[#6fd6c3] font-semibold"
                    >
                        {isEdit ? "Save changes" : "Create habit"}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="neu-btn px-4 py-2 rounded-[13px] text-sm font-semibold text-[#868da0] hover:text-[#d3d7e0]"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </GlassModal>
    );
}
