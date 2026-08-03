// Runnable self-check for goal-calc pure functions. Run: npx tsx lib/goal-calc.check.ts
import assert from "node:assert/strict";
import type { Goal } from "./database";
import { formatGoalAmount, goalUnit, computePace, computeMomentum } from "./goal-calc";

const base: Goal = {
    id: "g1", user_id: "u1", title: "T", goal_type: "money", unit: null,
    target_amount: 100, current_amount: 40, deadline: null, status: "active",
    created_at: "2026-01-01T00:00:00.000Z", habit_id: null, category: null, completed_at: null,
};

// formatGoalAmount: money -> $, count -> unit label
assert.equal(formatGoalAmount(base, 1234), "$1,234");
assert.equal(formatGoalAmount({ ...base, goal_type: "count", unit: "books" }, 7), "7 books");
assert.equal(formatGoalAmount({ ...base, goal_type: "count", unit: null }, 7), "7");
assert.equal(goalUnit({ ...base, goal_type: "count", unit: "books" }), "books");

// computePace: no deadline -> null
assert.equal(computePace(base, 40, Date.now()), null);

// computePace: exactly on the linear line -> ~0 behindDays
const created = new Date("2026-01-01T00:00:00.000Z").getTime();
const paced: Goal = { ...base, deadline: "2026-01-11" }; // 10-day window
const midday = created + 5 * 86400000; // halfway -> expect 50% done
const pace = computePace(paced, 50, midday);
assert(pace !== null && Math.abs(pace.behindDays) < 0.001, `on-pace behindDays ~0, got ${pace?.behindDays}`);

// behind: halfway through window but 0% done -> ~5 days behind
const behind = computePace(paced, 0, midday);
assert(behind !== null && Math.abs(behind.behindDays - 5) < 0.001, `expected 5d behind, got ${behind?.behindDays}`);

// computeMomentum: recent activity + ahead of pace -> hot
const hot = computeMomentum(paced, 60, [new Date(midday).toISOString().slice(0, 10)], midday);
assert.equal(hot.temp, "hot", `expected hot, got ${hot.temp} (score ${hot.score})`);

// computeMomentum: no activity + behind -> cold
const cold = computeMomentum(paced, 0, [], midday);
assert.equal(cold.temp, "cold", `expected cold, got ${cold.temp} (score ${cold.score})`);

// computeMomentum: no deadline falls back to recency only
const recencyOnly = computeMomentum(base, 40, [new Date().toISOString().slice(0, 10)], Date.now());
assert.equal(recencyOnly.temp, "hot", `recent activity no-deadline -> hot, got ${recencyOnly.temp}`);

console.log("ok: goal-calc all checks passed");
