'use client';

export interface Insight {
    id: string;
    domain: "tasks" | "habits" | "finance" | "coach";
    message: string;
}

const DOMAIN_COLOR: Record<Insight["domain"], string> = {
    tasks: "text-blue-400",
    habits: "text-amber-400",
    finance: "text-green-400",
    coach: "text-violet-400",
};

const SNOOZE_MS = { "1h": 3_600_000, "1d": 86_400_000, "1w": 604_800_000 } as const;

interface Props {
    insight: Insight;
    onDismiss: (id: string) => void;
    onSnooze: (id: string, until: number) => void;
}

export function InsightCard({ insight, onDismiss, onSnooze }: Props) {
    return (
        <div className="relative w-80 backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
            <button
                type="button"
                aria-label="Dismiss"
                onClick={() => onDismiss(insight.id)}
                className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-50 transition-colors text-sm leading-none"
            >
                ✕
            </button>

            <span className={`text-xs tracking-wide uppercase font-medium ${DOMAIN_COLOR[insight.domain]}`}>
                {insight.domain}
            </span>

            <p className="text-sm text-zinc-50 mt-1 pr-5">{insight.message}</p>

            <div className="flex gap-3 mt-3">
                {(Object.keys(SNOOZE_MS) as (keyof typeof SNOOZE_MS)[]).map((label) => (
                    <button
                        key={label}
                        type="button"
                        onClick={() => onSnooze(insight.id, Date.now() + SNOOZE_MS[label])}
                        className="text-xs text-zinc-500 hover:text-zinc-50 transition-colors"
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}
