import { supabaseServer } from "@/lib/supabase-server";
import { GoalList } from "@/components/dashboard/GoalList";

export default async function GoalsPage() {
    const supabase = await supabaseServer();
    const { data: goals } = await supabase.from("goals").select("*").eq("status", "active");
    const goalIds = (goals ?? []).map((g: { id: string }) => g.id);
    const { data: milestones } = await supabase.from("milestones").select("*").in("goal_id", goalIds);

    return <GoalList goals={goals ?? []} milestones={milestones ?? []} />;
}