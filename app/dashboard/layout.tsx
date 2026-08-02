'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChatPanel } from '@/components/agents/ChatPanel';
import { InsightStack } from '@/components/dashboard/InsightStack';
import { fadeSlideUp } from '@/lib/motin';

// Tasks tab removed in the neu redesign — the task widget lives on Home only.
const TABS = [
    { href: '/dashboard', label: 'Home', exact: true } as const,
    { href: '/dashboard/habits', label: 'Habits', exact: false } as const,
    { href: '/dashboard/finance', label: 'Finance', exact: false } as const,
    { href: '/dashboard/goals', label: 'Goals', exact: false } as const,
];

const ACTIVE_TAB = 'inset 4px 4px 9px rgba(0,0,0,0.5), inset -4px -4px 9px rgba(255,255,255,0.04)';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isHome = pathname === '/dashboard';
    // Focus mode hides the ambient coach + insight cards for a distraction-free view.
    const [focus, setFocus] = useState(false);
    return (
        <div className="min-h-screen w-full">
            <header className="mx-auto flex max-w-[1480px] items-center justify-between gap-6 px-6 pt-8">
                <div className="flex min-w-0 items-center gap-5">
                    <div className="glass select-none rounded-[18px] px-5 py-3 text-[15px] font-bold italic tracking-[0.14em] text-[#eceef3]">
                        AXIOM
                    </div>
                    <nav className="flex min-w-0 items-center gap-3 overflow-x-auto [scrollbar-width:none]">
                        {TABS.map((t) => {
                            const active = t.exact ? pathname === t.href : pathname?.startsWith(t.href);
                            return (
                                <Link
                                    key={t.href}
                                    href={t.href}
                                    style={active ? { boxShadow: ACTIVE_TAB } : undefined}
                                    className={cn(
                                        'neu-btn whitespace-nowrap rounded-[15px] px-5 py-2.5 text-[13.5px] font-semibold',
                                        active ? 'text-[#6fd6c3]' : 'text-[#868da0] hover:text-[#d3d7e0]'
                                    )}
                                >
                                    {t.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className="flex flex-none items-center gap-5">
                    <div className="flex items-center gap-2.5">
                        <span className="hidden text-[13px] font-medium text-[#868da0] sm:inline">Focus</span>
                        <button
                            type="button"
                            onClick={() => setFocus((f) => !f)}
                            aria-label="Toggle focus mode"
                            aria-pressed={focus}
                            className="neu-inset relative h-[26px] w-[48px] flex-none rounded-full"
                        >
                            <span
                                className="absolute top-[3px] h-[20px] w-[20px] rounded-full transition-[left] duration-200"
                                style={{
                                    left: focus ? 25 : 3,
                                    background: focus
                                        ? 'linear-gradient(145deg,#6fd6c3,#4bbfa9)'
                                        : 'linear-gradient(145deg,#2a2e36,#22252a)',
                                    boxShadow: '-2px -2px 5px rgba(255,255,255,0.06), 3px 3px 7px rgba(0,0,0,0.5)',
                                }}
                            />
                        </button>
                    </div>
                    <div className="flex h-[47px] w-[47px] flex-none items-center justify-center rounded-full text-base font-bold text-[#1d1f24] [background:linear-gradient(135deg,#f2a86f,#6fd6c3)] [box-shadow:-4px_-4px_10px_rgba(255,255,255,0.05),6px_6px_14px_rgba(0,0,0,0.5)]">
                        A
                    </div>
                </div>
            </header>
            <div className={cn('mx-auto px-6', isHome ? 'max-w-[1480px]' : 'max-w-[880px]')}>
                <AnimatePresence mode="wait">
                    <motion.div key={pathname} {...fadeSlideUp}>
                        {children}
                    </motion.div>
                </AnimatePresence>
            </div>
            {!focus && <InsightStack />}
            {!focus && <ChatPanel />}
        </div>
    );
}
