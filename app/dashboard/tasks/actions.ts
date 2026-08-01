"use server";
import { requireUser } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createTask(formData: FormData) {
    const { supabase, user } = await requireUser();

    await supabase.from("tasks").insert({
        user_id: user.id,
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || null,
        priority: Number(formData.get("priority")),
        project_id: (formData.get("project_id") as string) || null,
        due_date: (formData.get("due_date") as string) || null,
        status: "todo",
    });
    revalidatePath("/dashboard/tasks");
}

export async function updateTaskStatus(taskId: string, status: string) {
    const { supabase, user } = await requireUser();
    await supabase.from("tasks").update({ status }).eq("id", taskId).eq("user_id", user.id);
    revalidatePath("/dashboard/tasks");
}

export async function reorderTask(taskId: string, project_id: string | null) {
    const { supabase, user } = await requireUser();
    await supabase.from("tasks").update({ project_id }).eq("id", taskId).eq("user_id", user.id);
    revalidatePath("/dashboard/tasks");
}

export async function updateTask(formData: FormData) {
    const { supabase, user } = await requireUser();

    const id = formData.get("id") as string;
    await supabase.from("tasks").update({
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || null,
        priority: Number(formData.get("priority")),
        project_id: (formData.get("project_id") as string) || null,
        due_date: (formData.get("due_date") as string) || null,
    }).eq("id", id).eq("user_id", user.id);
    revalidatePath("/dashboard/tasks");
}

export async function createProject(formData: FormData) {
    const { supabase, user } = await requireUser();

    await supabase.from("projects").insert({
        user_id: user.id,
        name: formData.get("name") as string,
        color: (formData.get("color") as string) || "#3b82f6",
    });
    revalidatePath("/dashboard/tasks");
}

export async function deleteTask(taskId: string) {
    const { supabase, user } = await requireUser();
    await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", user.id);
    revalidatePath("/dashboard/tasks");
}