import { redirect } from "next/navigation";
import { supabaseUser } from "@/lib/supabase-server";
import { TaskBoard } from "@/components/dashboard/TaskBoard";

export default async function TasksPage() {
    const { supabase, user } = await supabaseUser();

    if (!user) {
        redirect("/login");
    }

    const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("priority");

    const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id);

    return <TaskBoard initialTasks={tasks ?? []} projects={projects ?? []} />;
}