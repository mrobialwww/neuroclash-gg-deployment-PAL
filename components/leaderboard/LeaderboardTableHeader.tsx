interface LeaderboardTableHeaderProps {
    columns: { label: string; align?: "left" | "center" | "right" }[];
}

export function LeaderboardTableHeader({
    columns,
}: LeaderboardTableHeaderProps) {
    const alignMap = {
        left: "text-left",
        center: "text-center",
        right: "text-right",
    };

    return (
        <div className="mb-2 grid grid-cols-[80px_minmax(160px,1fr)_140px_140px] items-center gap-4 rounded-lg bg-[#323C6D] px-6 py-3">
            {columns.map((col, i) => (
                <span
                    key={i}
                    className="text-center text-sm font-bold tracking-wide text-white md:text-base"
                >
                    {col.label}
                </span>
            ))}
        </div>
    );
}
