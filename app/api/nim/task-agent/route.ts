import { NextRequest, NextResponse } from "next/server";
import { getTaskInsight } from "@/lib/agents/task-agent";
import type { Task } from "@/lib/database";

export async function POST(req: NextRequest) {
    try {
        const { tasks } = await req.json() as { tasks: Task[] };
        const insight = await getTaskInsight(tasks ?? []);
        return NextResponse.json({ insight });
    } catch {
        return NextResponse.json({ insight: "Focus on your highest priority task first." }, { status: 200 });
    }
}
