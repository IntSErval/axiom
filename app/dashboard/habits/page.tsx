import { supabaseServer } from "@/lib/supabase-server";
import { HabitList } from "@/components/dashboard/HabitList";

const NINETY_DAYS_AGO = new Date(Date.now() - 90 * 86400000).toISOString();

export default async function HabitsPage() {
    const supabase = await supabaseServer();
    const { data: habits } = await supabase.from("habits").select("*");
    const { data: logs } = await supabase
        .from("habit_logs")
        .select("*")
        .gte("completed_at", NINETY_DAYS_AGO); // last 90 days

    return <HabitList habits={habits ?? []} logs={logs ?? []} />;
}