import { NextRequest, NextResponse } from "next/server";
import { getFinanceInsight } from "@/lib/agents/finance-agent";
import type { Account, Transaction, Budget } from "@/lib/database";

export async function POST(req: NextRequest) {
    try {
        const { accounts, transactions, budgets } = await req.json() as {
            accounts: Account[];
            transactions: Transaction[];
            budgets: Budget[];
        };
        const insight = await getFinanceInsight(accounts ?? [], transactions ?? [], budgets ?? []);
        return NextResponse.json({ insight });
    } catch {
        return NextResponse.json({ insight: "Track your spending to unlock financial insights." }, { status: 200 });
    }
}
