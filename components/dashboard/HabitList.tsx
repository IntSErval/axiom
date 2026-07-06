"use client";
import { GlassCard } from "@/components/ui/GlassCard";
import { computeStreak } from "@/lib/streaks";
import { logHabit } from "@/app/dashboard/habits/actions";
import type { Habit, HabitLog } from "@/lib/database";

export function HabitList({ habits, logs }: { habits: Habit[]; logs: HabitLog[] }) {
    return (
        <div className="max-w-2xl mx-auto py-8 space-y-3">
            <h1 className="text-2xl font-bold italic mb-6 text-zinc-50">Habits</h1>
            {habits.map((habit) => {
                const habitLogs = logs.filter((l) => l.habit_id === habit.id);
                const streak = computeStreak(habitLogs);
                const loggedToday = habitLogs.some((l) => l.completed_at.slice(0, 10) === new Date().toISOString().slice(0, 10));

                return (
                    <GlassCard key={habit.id} className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-zinc-50">{habit.name}</p>
                            <p className="text-sm text-zinc-500">
                                {streak > 0 && <span className="text-amber-400">🔥 {streak} day streak</span>}
                            </p>
                        </div>
                        <button
                            onClick={() => logHabit(habit.id)}
                            disabled={loggedToday}
                            className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {loggedToday ? "Logged" : "Log today"}
                        </button>
                    </GlassCard>
                );
            })}
        </div>
    );
}