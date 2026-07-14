"use server";
import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function logHabit(habitId: string) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data: habit } = await supabase.from("habits").select("id").eq("id", habitId).eq("user_id", user.id).single();
    if (!habit) throw new Error("Habit not found");
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("habit_logs").insert({ habit_id: habitId, completed_at: today });
    revalidatePath("/dashboard/habits");
}

export async function createHabit(formData: FormData) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const name = formData.get("name") as string;
    if (!name) throw new Error("name required");
    await supabase.from("habits").insert({
        user_id: user.id,
        name,
        frequency: formData.get("frequency") as string,
        target: Number(formData.get("target") ?? 1),
    });
    revalidatePath("/dashboard/habits");
}

export async function updateHabit(formData: FormData) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const name = formData.get("name") as string;
    if (!name) throw new Error("name required");
    await supabase.from("habits").update({
        name,
        frequency: formData.get("frequency") as string,
        target: Number(formData.get("target") ?? 1),
    }).eq("id", formData.get("id") as string).eq("user_id", user.id);
    revalidatePath("/dashboard/habits");
}

export async function deleteHabit(habitId: string) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    await supabase.from("habits").delete().eq("id", habitId).eq("user_id", user.id);
    revalidatePath("/dashboard/habits");
}