import { SkeletonCard } from "@/components/ui/Skeleton";

// Home (bento grid). Also the fallback for any child route without its own loading.tsx.
export default function Loading() {
    return (
        <div className="max-w-[1400px] mx-auto py-8 grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(140px,auto)]">
            <SkeletonCard lines={3} className="md:col-span-2 md:row-span-2" />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={4} className="md:col-span-2" />
            <SkeletonCard lines={3} />
        </div>
    );
}
