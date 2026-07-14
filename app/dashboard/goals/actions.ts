"use server";
import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { MilestoneStatus } from "@/lib/database";

async function getUser() {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    return { supabase, user };
}

export async function createGoal(formData: FormData) {
    const { supabase, user } = await getUser();
    const title = formData.get("title") as string;
    if (!title?.trim()) throw new Error("Title is required");
    const raw = Number(formData.get("target_amount"));
    if (isNaN(raw)) throw new Error("Invalid target amount");
    const deadline = (formData.get("deadline") as string) || null;
    await supabase.from("goals").insert({
        user_id: user.id,
        title: title.trim(),
        target_amount: raw,
        current_amount: 0,
        deadline: deadline || null,
        status: "active",
    });
    revalidatePath("/dashboard/goals");
}

export async function updateGoal(formData: FormData) {
    const { supabase, user } = await getUser();
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    if (!title?.trim()) throw new Error("Title is required");
    const raw = Number(formData.get("target_amount"));
    if (isNaN(raw)) throw new Error("Invalid target amount");
    const deadline = (formData.get("deadline") as string) || null;
    const status = formData.get("status") as string;
    await supabase.from("goals").update({
        title: title.trim(),
        target_amount: raw,
        deadline: deadline || null,
        status,
    }).eq("id", id).eq("user_id", user.id);
    revalidatePath("/dashboard/goals");
}

export async function updateGoalProgress(goalId: string, current_amount: number) {
    if (isNaN(current_amount)) throw new Error("Invalid amount");
    const { supabase, user } = await getUser();
    await supabase.from("goals").update({ current_amount }).eq("id", goalId).eq("user_id", user.id);
    revalidatePath("/dashboard/goals");
}

export async function deleteGoal(goalId: string) {
    const { supabase, user } = await getUser();
    await supabase.from("goals").delete().eq("id", goalId).eq("user_id", user.id);
    revalidatePath("/dashboard/goals");
}

export async function createMilestone(formData: FormData) {
    const { supabase } = await getUser();
    const goal_id = formData.get("goal_id") as string;
    const title = formData.get("title") as string;
    if (!goal_id) throw new Error("goal_id is required");
    if (!title?.trim()) throw new Error("Title is required");
    const raw = Number(formData.get("target_amount"));
    if (isNaN(raw)) throw new Error("Invalid target amount");
    const due_date = (formData.get("due_date") as string) || null;
    await supabase.from("milestones").insert({
        goal_id,
        title: title.trim(),
        target_amount: raw,
        status: "pending",
        due_date: due_date || null,
    });
    revalidatePath("/dashboard/goals");
}

export async function toggleMilestone(milestoneId: string, currentStatus: MilestoneStatus) {
    const { supabase } = await getUser();
    const next: MilestoneStatus = currentStatus === "achieved" ? "pending" : "achieved";
    await supabase.from("milestones").update({ status: next }).eq("id", milestoneId);
    revalidatePath("/dashboard/goals");
}
