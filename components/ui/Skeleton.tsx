// Shimmering placeholder block. Native Tailwind animate-pulse — no deps.
export function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />;
}

// A glass card full of skeleton lines — the common shape across dashboard tabs.
export function SkeletonCard({ lines = 2, className = "" }: { lines?: number; className?: string }) {
    return (
        <div className={`glass p-4 space-y-3 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} className={`h-4 ${i === 0 ? "w-1/2" : "w-3/4"}`} />
            ))}
        </div>
    );
}
