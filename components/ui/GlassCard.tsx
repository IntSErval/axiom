export function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-2xl ${className}`}>
            {children}
        </div>
    );
}