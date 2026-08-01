import { NextResponse } from "next/server";
import { supabaseUser } from "@/lib/supabase-server";

export async function GET() {
    const { supabase, user } = await supabaseUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: tasks, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("priority");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tasks: tasks ?? [] });
}
