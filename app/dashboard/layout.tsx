'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
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
    const isHome = pathname === '/dashboard';
    return (
        <div className="min-h-screen w-full">
            <header className={cn('sticky top-0 z-20 mx-auto pt-6 px-6 flex items-center gap-3', isHome ? 'max-w-[1400px]' : 'max-w-3xl')}>
                <div className="glass rounded-full px-4 py-2 text-sm font-bold italic tracking-wide text-zinc-50 select-none">
                    AXIOM
                </div>
                <nav className="flex items-center gap-2">
                    {TABS.map((t) => {
                        const active = t.exact ? pathname === t.href : pathname?.startsWith(t.href);
                        return (
                            <Link key={t.href} href={t.href} className={cn(
                                'glass rounded-full px-4 py-2 text-sm transition-[color,background-color,transform] duration-200 active:scale-[0.97]',
                                active ? 'bg-white/[0.10] text-zinc-50' : 'text-white/45 hover:text-zinc-50'
                            )}>
                                {t.label}
                            </Link>
                        );
                    })}
                </nav>
            </header>
            <div className={cn('mx-auto px-6', isHome ? 'max-w-[1400px]' : 'max-w-3xl')}>
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
