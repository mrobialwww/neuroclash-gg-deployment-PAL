import { LeaderboardAvatar } from "@/components/leaderboard/LeaderboardAvatar";
import { LeaderboardRankCell } from "@/components/leaderboard/LeaderboardRankCell";

export interface EndgamePlayer {
    id: string;
    position: number;
    username: string;
    characterImage: string;
    baseCharacter: string;
    playTime: string;
    wins: number;
    losses: number;
}

interface EndgameTableRowProps {
    player: EndgamePlayer;
    isMe?: boolean;
}

export function EndgameTableRow({
    player,
    isMe = false,
}: EndgameTableRowProps) {
    // Row Background Color based on if user is me or regular
    const bgColor = isMe ? "bg-[#566CB1]" : "bg-[#32387D]";

    return (
        <div
            className={`grid grid-cols-[80px_minmax(140px,1fr)_140px_140px] items-center gap-4 rounded-lg px-6 py-1 transition-all duration-200 md:gap-8 ${bgColor}`}
        >
            {/* Peringkat (Position) */}
            <div className="flex items-center justify-center">
                {isMe && player.position === 0 ? (
                    <span className="text-xs font-medium text-white sm:text-sm">
                        Tidak Ada
                    </span>
                ) : (
                    <div className="scale-75 transform sm:scale-90 md:scale-100">
                        <LeaderboardRankCell position={player.position} />
                    </div>
                )}
            </div>

            {/* Pemain (Avatar + Name) */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-3 md:gap-4">
                <div className="shrink-0 scale-75 transform sm:scale-90 md:scale-100">
                    <LeaderboardAvatar
                        imageUrl={player.characterImage}
                        baseCharacter={player.baseCharacter}
                        size="md"
                    />
                </div>
                <span className="truncate text-sm font-medium text-white sm:text-base md:text-lg">
                    {player.username}
                </span>
            </div>

            {/* Waktu Bermain */}
            <div className="flex min-w-0 items-center justify-center text-center">
                <span className="whitespace-nowrap text-xs font-medium text-white/90 sm:text-sm md:text-base">
                    {player.playTime}
                </span>
            </div>

            {/* Hasil */}
            <div className="flex min-w-0 items-center justify-center text-center">
                <span className="whitespace-nowrap text-xs font-medium text-white/90 sm:text-sm md:text-base">
                    {player.wins} Menang - {player.losses} Kalah
                </span>
            </div>
        </div>
    );
}
