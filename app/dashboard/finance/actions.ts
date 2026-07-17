"use server";
import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

const ACCOUNT_TYPES = ["checking", "savings", "investment"];

async function requireUser() {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    return { supabase, user };
}

// ponytail: read-then-write balance update; fine for a single user, move to a SQL RPC if concurrent writers ever matter
async function shiftBalance(supabase: SupabaseClient, userId: string, accountId: string, delta: number) {
    const { data: acc, error } = await supabase
        .from("accounts").select("balance").eq("id", accountId).eq("user_id", userId).single();
    if (error) throw new Error(error.message);
    const { error: updateError } = await supabase
        .from("accounts").update({ balance: acc.balance + delta }).eq("id", accountId).eq("user_id", userId);
    if (updateError) throw new Error(updateError.message);
}

export async function createTransaction(formData: FormData) {
    const { supabase, user } = await requireUser();

    const rawAmount = parseFloat(formData.get("amount") as string);
    const kind = formData.get("kind") as string;
    const category = (formData.get("category") as string)?.trim();
    const account_id = formData.get("account_id") as string;
    const description = (formData.get("description") as string)?.trim() || null;
    const date = formData.get("date") as string;

    if (isNaN(rawAmount) || !category || !account_id) throw new Error("Amount, category, and account are required");
    if (!date) throw new Error("Date is required");

    // Expenses are stored negative (drains balance, fills the envelope); income positive
    const amount = kind === "income" ? Math.abs(rawAmount) : -Math.abs(rawAmount);

    const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        amount,
        category,
        account_id,
        description,
        date,
    });
    if (error) throw new Error(error.message);

    await shiftBalance(supabase, user.id, account_id, amount);
    revalidatePath("/dashboard/finance");
}

export async function deleteTransaction(transactionId: string) {
    const { supabase, user } = await requireUser();

    const { data: txn, error: fetchError } = await supabase
        .from("transactions").select("amount, account_id")
        .eq("id", transactionId).eq("user_id", user.id).single();
    if (fetchError) throw new Error(fetchError.message);

    const { error } = await supabase
        .from("transactions").delete()
        .eq("id", transactionId).eq("user_id", user.id);
    if (error) throw new Error(error.message);

    await shiftBalance(supabase, user.id, txn.account_id, -txn.amount);
    revalidatePath("/dashboard/finance");
}

export async function createAccount(formData: FormData) {
    const { supabase, user } = await requireUser();

    const name = (formData.get("name") as string)?.trim();
    const type = formData.get("type") as string;
    const rawBalance = formData.get("balance");
    const balance = rawBalance ? parseFloat(rawBalance as string) : 0;

    if (!name) throw new Error("Account name is required");
    if (!ACCOUNT_TYPES.includes(type)) throw new Error("Invalid account type");
    if (isNaN(balance)) throw new Error("Balance must be a number");

    const { error } = await supabase.from("accounts").insert({ user_id: user.id, name, type, balance });
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/finance");
}

export async function updateAccount(accountId: string, formData: FormData) {
    const { supabase, user } = await requireUser();

    const name = (formData.get("name") as string)?.trim();
    const type = formData.get("type") as string;
    const balance = parseFloat(formData.get("balance") as string);

    if (!name) throw new Error("Account name is required");
    if (!ACCOUNT_TYPES.includes(type)) throw new Error("Invalid account type");
    if (isNaN(balance)) throw new Error("Balance must be a number");

    const { error } = await supabase
        .from("accounts").update({ name, type, balance })
        .eq("id", accountId).eq("user_id", user.id);
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/finance");
}

export async function deleteAccount(accountId: string) {
    const { supabase, user } = await requireUser();

    // Remove the account's transactions first so the FK doesn't block the delete
    const { error: txnError } = await supabase
        .from("transactions").delete()
        .eq("account_id", accountId).eq("user_id", user.id);
    if (txnError) throw new Error(txnError.message);

    const { error } = await supabase
        .from("accounts").delete()
        .eq("id", accountId).eq("user_id", user.id);
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/finance");
}

export async function createBudget(formData: FormData) {
    const { supabase, user } = await requireUser();

    const category = (formData.get("category") as string)?.trim();
    const limit_amount = parseFloat(formData.get("limit_amount") as string);

    if (!category) throw new Error("Category name is required");
    if (isNaN(limit_amount) || limit_amount <= 0) throw new Error("Fund limit must be a positive number");

    const { error } = await supabase.from("budgets").insert({
        user_id: user.id,
        category,
        limit_amount,
        period: "monthly",
    });
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/finance");
}

export async function updateBudget(budgetId: string, formData: FormData) {
    const { supabase, user } = await requireUser();

    const category = (formData.get("category") as string)?.trim();
    const limit_amount = parseFloat(formData.get("limit_amount") as string);

    if (!category) throw new Error("Category name is required");
    if (isNaN(limit_amount) || limit_amount <= 0) throw new Error("Fund limit must be a positive number");

    const { error } = await supabase
        .from("budgets").update({ category, limit_amount })
        .eq("id", budgetId).eq("user_id", user.id);
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/finance");
}

export async function deleteBudget(budgetId: string) {
    const { supabase, user } = await requireUser();

    const { error } = await supabase
        .from("budgets").delete()
        .eq("id", budgetId).eq("user_id", user.id);
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/finance");
}
