import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCoachResponse, type ChatMessage } from "@/lib/agents/coach-agent";

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json() as { messages: ChatMessage[] };
        const supabase = await supabaseServer();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ reply: "Please sign in to chat with your coach." }, { status: 200 });

        const [{ data: tasks }, { data: habits }, { data: accounts }, { data: goals }] = await Promise.all([
            supabase.from("tasks").select("title,priority,status,due_date").eq("user_id", user.id).neq("status", "done").order("priority").limit(10),
            supabase.from("habits").select("name,frequency,streak").eq("user_id", user.id),
            supabase.from("accounts").select("name,balance").eq("user_id", user.id),
            supabase.from("goals").select("title,target_amount,current_amount,deadline").eq("user_id", user.id).eq("status", "active"),
        ]);

        const context = [
            `Open tasks: ${JSON.stringify(tasks ?? [])}`,
            `Habits: ${JSON.stringify(habits ?? [])}`,
            `Accounts: ${JSON.stringify(accounts ?? [])}`,
            `Active goals: ${JSON.stringify(goals ?? [])}`,
        ].join("\n");

        const reply = await getCoachResponse(messages ?? [], context);
        return NextResponse.json({ reply });
    } catch {
        return NextResponse.json({ reply: "I'm having trouble connecting right now — try again in a moment." }, { status: 200 });
    }
}
