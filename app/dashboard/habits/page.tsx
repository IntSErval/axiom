import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { HabitList } from "@/components/dashboard/HabitList";

// 26 weeks — matches the contribution heatmap window
const LOOKBACK = new Date(Date.now() - 26 * 7 * 86400000).toISOString();

export default async function HabitsPage() {
    const supabase = await supabaseServer();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: habits } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id);
    const { data: logs } = await supabase
        .from("habit_logs")
        .select("*, habits!inner(user_id)")
        .eq("habits.user_id", user.id)
        .gte("completed_at", LOOKBACK);

    return <HabitList habits={habits ?? []} logs={logs ?? []} />;
}