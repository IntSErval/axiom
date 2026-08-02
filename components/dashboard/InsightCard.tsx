'use client';

import Link from 'next/link';

export interface Insight {
    id: string;
    domain: "tasks" | "habits" | "finance" | "coach";
    message: string;
    href?: string;
    action?: "open-coach";
}

const DOMAIN_COLOR: Record<Insight["domain"], string> = {
    tasks: "text-[#6fd6c3]",
    habits: "text-[#f2a86f]",
    finance: "text-[#6fd6c3]",
    coach: "text-[#f2a86f]",
};

const SNOOZE_MS = { "1h": 3_600_000, "1d": 86_400_000, "1w": 604_800_000 } as const;

interface Props {
    insight: Insight;
    onDismiss: (id: string) => void;
    onSnooze: (id: string, until: number) => void;
}

export function InsightCard({ insight, onDismiss, onSnooze }: Props) {
    return (
        <div className="glass relative w-80 rounded-[20px] p-4">
            <button
                type="button"
                aria-label="Dismiss"
                onClick={() => onDismiss(insight.id)}
                className="absolute top-3 right-3 text-[#868da0] hover:text-[#d3d7e0] transition-colors text-sm leading-none"
            >
                ✕
            </button>

            <span className={`text-xs tracking-wide uppercase font-medium ${DOMAIN_COLOR[insight.domain]}`}>
                {insight.domain}
            </span>

            <p className="text-sm text-[#d3d7e0] mt-1 pr-5">{insight.message}</p>

            {insight.href && (
                <Link
                    href={insight.href}
                    className={`inline-block text-xs font-medium mt-2 hover:underline ${DOMAIN_COLOR[insight.domain]}`}
                >
                    View →
                </Link>
            )}

            {insight.action === 'open-coach' && (
                <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('axiom:open-coach'))}
                    className={`block text-xs font-medium mt-2 hover:underline ${DOMAIN_COLOR[insight.domain]}`}
                >
                    Open coach →
                </button>
            )}

            <div className="flex gap-3 mt-3">
                {(Object.keys(SNOOZE_MS) as (keyof typeof SNOOZE_MS)[]).map((label) => (
                    <button
                        key={label}
                        type="button"
                        onClick={() => onSnooze(insight.id, Date.now() + SNOOZE_MS[label])}
                        className="text-xs text-[#868da0] hover:text-[#d3d7e0] transition-colors"
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}
