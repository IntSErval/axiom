import type { ReactNode } from "react";

export function GlassPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <section className={`glass ${className}`}>
            {children}
        </section>
    );
}