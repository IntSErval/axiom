import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { FinanceDashboard } from "@/components/dashboard/FinanceDashboard";

export default async function FinancePage() {
    const supabase = await supabaseServer();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    const [{ data: accounts }, { data: transactions }, { data: budgets }] = await Promise.all([
        supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("transactions").select("*").eq("user_id", user.id).gte("date", startOfMonth.toISOString().slice(0, 10)),
        supabase.from("budgets").select("*").eq("user_id", user.id).order("created_at"),
    ]);

    return <FinanceDashboard accounts={accounts ?? []} transactions={transactions ?? []} budgets={budgets ?? []} />;
}
