import { NextRequest, NextResponse } from "next/server";
import { getHabitInsight } from "@/lib/agents/habit-agent";
import type { Habit, HabitLog } from "@/lib/database";

export async function POST(req: NextRequest) {
    try {
        const { habits, logs } = await req.json() as { habits: Habit[]; logs: HabitLog[] };
        const insight = await getHabitInsight(habits ?? [], logs ?? []);
        return NextResponse.json({ insight });
    } catch {
        return NextResponse.json({ insight: "Consistency is the key to habit formation." }, { status: 200 });
    }
}
