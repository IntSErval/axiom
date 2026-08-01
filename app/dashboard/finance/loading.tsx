import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div className="max-w-3xl mx-auto py-8 px-4 space-y-4">
            <Skeleton className="h-8 w-36 mb-2" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonCard key={i} lines={2} />
                ))}
            </div>
            <SkeletonCard lines={5} />
        </div>
    );
}
