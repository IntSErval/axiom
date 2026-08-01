import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-8 w-32" />
                <div className="flex gap-3">
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-24" />
                </div>
            </div>
            <Skeleton className="h-5 w-24 mb-3" />
            <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} lines={1} className="!py-5" />
                ))}
            </div>
        </div>
    );
}
