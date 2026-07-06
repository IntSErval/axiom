import type { ReactNode } from "react";

export function GlassPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <section className={`backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-2xl ${className}`}>
            {children}
        </section>
    );
}