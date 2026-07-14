import { NextRequest, NextResponse } from "next/server";
import { getGoalsInsight } from "@/lib/agents/goals-agent";
import type { Goal, Milestone } from "@/lib/database";

export async function POST(req: NextRequest) {
    try {
        const { goals, milestones } = await req.json() as {
            goals: Goal[];
            milestones: Milestone[];
        };
        const insight = await getGoalsInsight(goals ?? [], milestones ?? []);
        return NextResponse.json({ insight });
    } catch {
        return NextResponse.json({ insight: "Keep making progress toward your goals." }, { status: 200 });
    }
}
