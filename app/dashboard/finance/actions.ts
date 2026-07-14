"use server";
import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createTransaction(formData: FormData) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const amount = parseFloat(formData.get("amount") as string);
    const category = (formData.get("category") as string)?.trim();
    const account_id = formData.get("account_id") as string;
    const description = (formData.get("description") as string)?.trim() || null;
    const date = formData.get("date") as string;

    if (!amount || !category || !account_id) throw new Error("Amount, category, and account are required");

    const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        amount,
        category,
        account_id,
        description,
        date,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/finance");
}

export async function createAccount(formData: FormData) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const name = (formData.get("name") as string)?.trim();
    const type = formData.get("type") as string;
    const balance = parseFloat(formData.get("balance") as string) || 0;

    if (!name) throw new Error("Account name is required");

    const { error } = await supabase.from("accounts").insert({
        user_id: user.id,
        name,
        type,
        balance,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/finance");
}

export async function deleteTransaction(transactionId: string) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId)
        .eq("user_id", user.id);
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/finance");
}
