"use server";
import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createTask(formData: FormData) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    await supabase.from("tasks").insert({
        user_id: user.id,
        title: formData.get("title") as string,
        priority: Number(formData.get("priority")),
        project_id: (formData.get("project_id") as string) || null,
        due_date: (formData.get("due_date") as string) || null,
        status: "todo",
    });
    revalidatePath("/dashboard/tasks");
}

export async function updateTaskStatus(taskId: string, status: string) {
    const supabase = await supabaseServer();
    await supabase.from("tasks").update({ status }).eq("id", taskId);
    revalidatePath("/dashboard/tasks");
}

export async function reorderTask(taskId: string, project_id: string | null) {
    const supabase = await supabaseServer();
    await supabase.from("tasks").update({ project_id }).eq("id", taskId);
    revalidatePath("/dashboard/tasks");
}

export async function deleteTask(taskId: string) {
    const supabase = await supabaseServer();
    await supabase.from("tasks").delete().eq("id", taskId);
    revalidatePath("/dashboard/tasks");
}