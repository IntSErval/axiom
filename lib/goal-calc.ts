import type { Goal } from "./database";

const DAY_MS = 86400000;

// ── Display formatting ──────────────────────────────────────────────────────
// Money goals render as USD; count goals render as a plain number + unit label.
export function goalUnit(goal: Goal): string | null {
    return goal.goal_type === "count" ? (goal.unit?.trim() || null) : null;
}

export function formatGoalAmount(goal: Goal, n: number): string {
    if (goal.goal_type === "money") return `$${Math.round(n).toLocaleString()}`;
    const unit = goalUnit(goal);
    const num = n.toLocaleString();
    return unit ? `${num} ${unit}` : num;
}

// ── Pace (linear expectation from creation → deadline) ───────────────────────
// + behindDays = behind schedule, − = ahead. `null` when no deadline / bad data.
export function computePace(goal: Goal, current: number, now = Date.now()) {
    if (!goal.deadline || goal.target_amount <= 0) return null;
    const created = new Date(goal.created_at).getTime();
    const deadline = new Date(goal.deadline + "T00:00:00Z").getTime(); // UTC, to match created_at's frame
    const totalDays = (deadline - created) / DAY_MS;
    if (totalDays <= 0) return null;
    const elapsedDays = Math.max((now - created) / DAY_MS, 0);
    const behindDays = elapsedDays - (current / goal.target_amount) * totalDays;
    const velocity = elapsedDays > 0.04 ? current / elapsedDays : 0;
    const projected = velocity > 0 ? new Date(created + (goal.target_amount / velocity) * DAY_MS) : null;
    return { behindDays, projected };
}

// ── Momentum (the differentiator) ───────────────────────────────────────────
// Blends pace-vs-target with the recency/health of the goal's activity feed
// (linked habit logs, linked-category txns, or manual check-ins — dates passed in).
export type MomentumTemp = "hot" | "warm" | "cool" | "cold";
export interface Momentum { score: number; temp: MomentumTemp }

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function tempFor(score: number): MomentumTemp {
    if (score >= 0.75) return "hot";
    if (score >= 0.5) return "warm";
    if (score >= 0.25) return "cool";
    return "cold";
}

export function computeMomentum(goal: Goal, current: number, activity: string[], now = Date.now()): Momentum {
    // Recency: last activity within ~2 days = full; decays to 0 over 14 days.
    let recencyScore = 0;
    if (activity.length) {
        const last = Math.max(...activity.map((d) => new Date(d + "T00:00:00Z").getTime()));
        const daysSince = Math.max(0, (now - last) / DAY_MS);
        recencyScore = clamp01(1 - (daysSince - 2) / 12);
    }

    const pace = computePace(goal, current, now);
    if (!pace) {
        // No deadline → momentum is purely "are you still showing up?"
        const score = recencyScore;
        return { score, temp: tempFor(score) };
    }
    // Pace: on-pace or ahead = 1; each day behind subtracts, 0 at a week+ behind.
    const paceScore = clamp01(1 - Math.max(0, pace.behindDays) / 7);
    const score = 0.5 * paceScore + 0.5 * recencyScore;
    return { score, temp: tempFor(score) };
}
