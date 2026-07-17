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

function parsePositiveAmount(formData: FormData, field: string): number {
    const raw = (formData.get(field) as string)?.trim();
    if (!raw) throw new Error(`${field} is required`);
    const n = Number(raw);
    if (isNaN(n) || n <= 0) throw new Error(`${field} must be a positive number`);
    return n;
}

export async function createGoal(formData: FormData) {
    const { supabase, user } = await getUser();
    const title = formData.get("title") as string;
    if (!title?.trim()) throw new Error("Title is required");
    const target_amount = parsePositiveAmount(formData, "target_amount");
    const deadline = (formData.get("deadline") as string)?.trim() || null;
    const habit_id = (formData.get("habit_id") as string)?.trim() || null;
    const category = (formData.get("category") as string)?.trim() || null;
    const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        title: title.trim(),
        target_amount,
        current_amount: 0,
        deadline,
        status: "active",
        habit_id,
        category,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/goals");
}

export async function updateGoal(formData: FormData) {
    const { supabase, user } = await getUser();
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    if (!title?.trim()) throw new Error("Title is required");
    const target_amount = parsePositiveAmount(formData, "target_amount");
    const deadline = (formData.get("deadline") as string)?.trim() || null;
    const status = formData.get("status") as string;
    const habit_id = (formData.get("habit_id") as string)?.trim() || null;
    const category = (formData.get("category") as string)?.trim() || null;
    // Only stamp completed_at on the transition into "completed" so re-saving
    // a completed goal doesn't rewrite its finish date.
    const { data: existing } = await supabase.from("goals").select("status").eq("id", id).eq("user_id", user.id).single();
    if (!existing) throw new Error("Goal not found");
    const completed_at =
        status === "completed"
            ? existing.status === "completed" ? undefined : new Date().toISOString()
            : null;
    const { error } = await supabase.from("goals").update({
        title: title.trim(),
        target_amount,
        deadline,
        status,
        habit_id,
        category,
        ...(completed_at !== undefined && { completed_at }),
    }).eq("id", id).eq("user_id", user.id);
    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/goals");
}

export async function updateGoalProgress(goalId: string, current_amount: number) {
    if (isNaN(current_amount) || current_amount < 0) throw new Error("Invalid amount");
    const { supabase, user } = await getUser();
    const { data: goal } = await supabase.from("goals").select("target_amount, status").eq("id", goalId).eq("user_id", user.id).single();
    if (!goal) throw new Error("Goal not found");
    const reachedTarget = goal.status === "active" && current_amount >= goal.target_amount;
    const { error } = await supabase.from("goals").update({
        current_amount,
        ...(reachedTarget && { status: "completed", completed_at: new Date().toISOString() }),
    }).eq("id", goalId).eq("user_id", user.id);
    if (error) throw new Error(error.message);
    // Log the check-in — powers pace velocity and the completion retrospective
    await supabase.from("goal_checkins").insert({ goal_id: goalId, amount: current_amount });
    revalidatePath("/dashboard/goals");
}

export async function deleteGoal(goalId: string) {
    const { supabase, user } = await getUser();
    const { error } = await supabase.from("goals").delete().eq("id", goalId).eq("user_id", user.id);
    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/goals");
}

export async function createMilestone(formData: FormData) {
    const { supabase, user } = await getUser();
    const goal_id = formData.get("goal_id") as string;
    const title = formData.get("title") as string;
    if (!goal_id) throw new Error("goal_id is required");
    if (!title?.trim()) throw new Error("Title is required");
    const target_amount = parsePositiveAmount(formData, "target_amount");
    const due_date = (formData.get("due_date") as string)?.trim() || null;
    // Ownership check: ensure this goal belongs to the caller
    const { data: goal } = await supabase.from("goals").select("id").eq("id", goal_id).eq("user_id", user.id).single();
    if (!goal) throw new Error("Goal not found");
    const { error } = await supabase.from("milestones").insert({
        goal_id,
        title: title.trim(),
        target_amount,
        status: "pending",
        due_date,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/goals");
}

export async function toggleMilestone(milestoneId: string, currentStatus: MilestoneStatus) {
    const { supabase, user } = await getUser();
    // Ownership check: join through goal to verify caller owns it
    const { data: ms } = await supabase.from("milestones").select("goal_id").eq("id", milestoneId).single();
    if (!ms) throw new Error("Milestone not found");
    const { data: goal } = await supabase.from("goals").select("id").eq("id", ms.goal_id).eq("user_id", user.id).single();
    if (!goal) throw new Error("Not authorized");
    const next: MilestoneStatus = currentStatus === "achieved" ? "pending" : "achieved";
    const { error } = await supabase.from("milestones").update({ status: next }).eq("id", milestoneId);
    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/goals");
}
