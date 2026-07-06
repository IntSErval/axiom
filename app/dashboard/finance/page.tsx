import { supabaseServer } from "@/lib/supabase-server";
import { FinanceDashboard } from "@/components/dashboard/FinanceDashboard";

export default async function FinancePage() {
    const supabase = await supabaseServer();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    const [{ data: accounts }, { data: transactions }, { data: budgets }] = await Promise.all([
        supabase.from("accounts").select("*"),
        supabase.from("transactions").select("*").gte("date", startOfMonth.toISOString().slice(0, 10)),
        supabase.from("budgets").select("*"),
    ]);

    return <FinanceDashboard accounts={accounts ?? []} transactions={transactions ?? []} budgets={budgets ?? []} />;
}