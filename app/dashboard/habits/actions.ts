"use server";
import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function logHabit(habitId: string) {
    const supabase = await supabaseServer();
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("habit_logs").insert({ habit_id: habitId, completed_at: today });
    revalidatePath("/dashboard/habits");
}

export async function createHabit(formData: FormData) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    await supabase.from("habits").insert({
        user_id: user.id,
        name: formData.get("name") as string,
        frequency: formData.get("frequency") as string,
        target: Number(formData.get("target") ?? 1),
    });
    revalidatePath("/dashboard/habits");
}

export async function updateHabit(formData: FormData) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    await supabase.from("habits").update({
        name: formData.get("name") as string,
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