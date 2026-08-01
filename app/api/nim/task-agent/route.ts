import { NextRequest, NextResponse } from "next/server";
import { getTaskInsight } from "@/lib/agents/task-agent";
import { supabaseUser } from "@/lib/supabase-server";
import type { Task } from "@/lib/database";

export async function POST(req: NextRequest) {
    const { supabase, user } = await supabaseUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    try {
        const { tasks } = await req.json() as { tasks: Task[] };
        const insight = await getTaskInsight(tasks ?? []);
        return NextResponse.json({ insight });
    } catch {
        return NextResponse.json({ insight: "Focus on your highest priority task first." }, { status: 200 });
    }
}
