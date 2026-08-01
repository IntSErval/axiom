import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div className="max-w-3xl mx-auto py-8 px-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-9 w-24" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} lines={3} />
            ))}
        </div>
    );
}
