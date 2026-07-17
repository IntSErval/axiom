import type { Goal, HabitLog, Transaction } from "./database";

// Derived progress for linked goals. Returns null for manual (unlinked) goals.
// Category link wins over habit link when both are set.
export function deriveCurrent(goal: Goal, habitLogs: HabitLog[], transactions: Transaction[]): number | null {
    const createdDay = goal.created_at.slice(0, 10);
    if (goal.category) {
        return transactions
            .filter((t) => t.category === goal.category && t.date >= createdDay)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    }
    if (goal.habit_id) {
        return habitLogs.filter((l) => l.habit_id === goal.habit_id && l.completed_at >= goal.created_at).length;
    }
    return null;
}

// Dates (YYYY-MM-DD) of the activity that fed this goal — for retro stats.
export function activityDates(goal: Goal, habitLogs: HabitLog[], transactions: Transaction[]): string[] | null {
    const createdDay = goal.created_at.slice(0, 10);
    if (goal.category) {
        return transactions.filter((t) => t.category === goal.category && t.date >= createdDay).map((t) => t.date.slice(0, 10));
    }
    if (goal.habit_id) {
        return habitLogs
            .filter((l) => l.habit_id === goal.habit_id && l.completed_at >= goal.created_at)
            .map((l) => l.completed_at.slice(0, 10));
    }
    return null;
}
