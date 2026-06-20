import { EndgameTableRow, EndgamePlayer } from "./EndgameTableRow";

interface EndgameTableProps {
    players: EndgamePlayer[];
    currentUserId?: string;
}

export function EndgameTable({ players, currentUserId }: EndgameTableProps) {
    // Define columns for the header
    const columns = [
        { label: "Peringkat" },
        { label: "Pemain" },
        { label: "Waktu Bermain" },
        { label: "Hasil" },
    ];

    return (
        <div className="w-full overflow-hidden rounded-2xl bg-[#211D56] p-4 shadow-xl sm:p-6">
            <div className="scrollbar-hide w-full overflow-x-auto">
                <div className="min-w-[700px]">
                    {/* Table Header */}
                    <div className="mb-2 grid grid-cols-[80px_minmax(140px,1fr)_140px_140px] items-center gap-4 rounded-lg bg-[#323C6D] px-6 py-3">
                        {columns.map((col, i) => (
                            <span
                                key={i}
                                className="text-center text-sm font-bold tracking-wide text-white md:text-base"
                            >
                                {col.label}
                            </span>
                        ))}
                    </div>

                    {/* Table Body */}
                    <div className="flex flex-col gap-2">
                        {players.map((player) => (
                            <EndgameTableRow
                                key={player.id}
                                player={player}
                                isMe={player.id === currentUserId}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
