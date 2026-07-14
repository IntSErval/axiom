'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { InsightCard, type Insight } from './InsightCard';

const STORAGE_KEY = 'axiom:insights:dismissed';

function readDismissed(): Record<string, number> {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, number>;
    } catch {
        return {};
    }
}

function writeDismissed(map: Record<string, number>) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch { /* quota or SSR */ }
}

export function InsightStack() {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [dismissed, setDismissed] = useState<Record<string, number>>({});

    useEffect(() => {
        setDismissed(readDismissed());
        fetch('/api/insights')
            .then(r => r.json() as Promise<{ insights: Insight[] }>)
            .then(({ insights }) => setInsights(insights))
            .catch(() => {});
    }, []);

    function hide(id: string, until: number) {
        const next = { ...dismissed, [id]: until };
        setDismissed(next);
        writeDismissed(next);
    }

    const visible = insights
        .filter(i => (dismissed[i.id] ?? 0) <= Date.now())
        .slice(0, 3);

    return (
        <div className="fixed bottom-24 right-6 z-40 flex flex-col gap-3 items-end">
            <AnimatePresence>
                {visible.map(insight => (
                    <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        transition={{ duration: 0.2 }}
                    >
                        <InsightCard
                            insight={insight}
                            onDismiss={id => hide(id, Number.MAX_SAFE_INTEGER)}
                            onSnooze={(id, until) => hide(id, until)}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
