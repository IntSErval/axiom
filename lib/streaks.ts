import type { HabitLog } from "@/lib/database";

export function computeStreak(logs: HabitLog[]): number {
    const days = new Set(logs.map((l) => l.completed_at.slice(0, 10)));
    let streak = 0;
    const cursor = new Date();
    while (days.has(cursor.toISOString().slice(0, 10))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}