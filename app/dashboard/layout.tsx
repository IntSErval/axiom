'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ChatPanel } from '@/components/agents/ChatPanel';
import { InsightStack } from '@/components/dashboard/InsightStack';
import { fadeSlideUp } from '@/lib/motin';

const TABS = [
    { href: '/dashboard', label: 'Home', exact: true } as const,
    { href: '/dashboard/tasks', label: 'Tasks', exact: false } as const,
    { href: '/dashboard/habits', label: 'Habits', exact: false } as const,
    { href: '/dashboard/finance', label: 'Finance', exact: false } as const,
    { href: '/dashboard/goals', label: 'Goals', exact: false } as const,
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    return (
        <div className="min-h-screen w-full bg-[#080810]">
            <header className="sticky top-0 z-20 mx-auto max-w-3xl pt-6 px-6">
                <GlassPanel className="px-2 py-2 flex items-center gap-1">
                    {TABS.map((t) => {
                        const active = t.exact ? pathname === t.href : pathname?.startsWith(t.href);
                        return (
                            <Link key={t.href} href={t.href} className={cn(
                                'rounded-xl px-3 py-1.5 text-sm transition-colors',
                                active ? 'bg-white/[0.08] text-zinc-50' : 'text-zinc-500 hover:text-zinc-50 hover:bg-white/[0.04]'
                            )}>
                                {t.label}
                            </Link>
                        );
                    })}
                </GlassPanel>
            </header>
            <div className="mx-auto max-w-3xl px-6">
                <AnimatePresence mode="wait">
                    <motion.div key={pathname} {...fadeSlideUp}>
                        {children}
                    </motion.div>
                </AnimatePresence>
            </div>
            <InsightStack />
            <ChatPanel />
        </div>
    );
}
