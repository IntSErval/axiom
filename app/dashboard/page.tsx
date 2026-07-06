import Link from "next/link";
import { GlassPanel } from "@/components/ui/GlassPanel";

const QUICK = [
    { href: "/dashboard/tasks", label: "Tasks" },
    { href: "/dashboard/habits", label: "Habits" },
    { href: "/dashboard/finance", label: "Finance" },
    { href: "/dashboard/goals", label: "Goals" },
] as const;

export default function DashboardHomePage() {
    return (
        <main className="space-y-6 py-12">
            <GlassPanel className="p-8">
                <h1 className="font-serif text-3xl font-bold italic text-zinc-50">Intelligence Summary</h1>
                <p className="mt-2 text-zinc-500 text-sm">
                    Insights from your domain agents will surface here once wired up
              </p>
          </GlassPanel>
            <GlassPanel className="p-6">
                <h2 className="text-zinc-50 font-medium mb-3">Quick Actions</h2>
                <div className="flex gap-3 flex-wrap">
                    {QUICK.map((q) => (
                        <Link
                            key={q.href}
                            href={q.href}
                            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-zinc-50 backdrop-blur-xl hover:bg-white/[0.06] transition-colors"
                        >
                            {q.label}
                      </Link>
                    ))}
              </div>
          </GlassPanel>
      </main>
    );
}
