import { NextRequest, NextResponse } from "next/server";
import { getGoalsInsight } from "@/lib/agents/goals-agent";
import type { Goal, Milestone } from "@/lib/database";
import type { MomentumTemp } from "@/lib/goal-calc";

export async function POST(req: NextRequest) {
    try {
        const { goals, milestones, momentum } = await req.json() as {
            goals: Goal[];
            milestones: Milestone[];
            momentum?: Record<string, MomentumTemp>;
        };
        const insight = await getGoalsInsight(goals ?? [], milestones ?? [], momentum ?? {});
        return NextResponse.json({ insight });
    } catch {
        return NextResponse.json({ insight: "Keep making progress toward your goals." }, { status: 200 });
    }
}
