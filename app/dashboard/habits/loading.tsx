import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div className="max-w-2xl mx-auto py-8 space-y-3">
            <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-8 w-24" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                    </div>
                    <Skeleton className="h-12 w-full" />
                </div>
            ))}
        </div>
    );
}
