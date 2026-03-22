export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
    );
}

export function CardSkeleton() {
    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 space-y-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-8 w-2/3" />
        </div>
    );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
    return (
        <div className="flex items-center gap-4 py-4 border-b border-slate-50 last:border-0 px-4">
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={i} className={`h-4 ${i === 0 ? "w-1/4" : "flex-1"}`} />
            ))}
        </div>
    );
}
