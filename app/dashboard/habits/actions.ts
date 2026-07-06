"use server";
import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function logHabit(habitId: string) {
    const supabase = await supabaseServer();
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("habit_logs").insert({ habit_id: habitId, completed_at: today });
    revalidatePath("/dashboard/habits");
}