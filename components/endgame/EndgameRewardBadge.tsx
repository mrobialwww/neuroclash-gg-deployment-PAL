import Image from "next/image";

interface EndgameRewardBadgeProps {
    coinsEarned: number;
    trophyWon: number;
    coinBoost?: number;
    trophyBoost?: number;
}

export function EndgameRewardBadge({
    coinsEarned,
    trophyWon,
    coinBoost = 0,
    trophyBoost = 0,
}: EndgameRewardBadgeProps) {
    return (
        <div
            className="flex flex-col gap-1 rounded-2xl px-4 py-2 backdrop-blur-md sm:gap-2 sm:px-6 sm:py-4"
            style={{
                background:
                    "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.10) 100%)",
                border: "1px solid rgba(255,255,255,0.18)",
            }}
        >
            <span className="text-center text-xs font-semibold text-white/80 sm:text-xs md:text-sm">
                Hadiah Total Pertandingan
            </span>

            <div className="mt-0.5 flex items-start justify-center gap-4 sm:mt-1 sm:gap-6">
                {/* Coin */}
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="relative h-5 w-5 shrink-0 sm:h-8 sm:w-8">
                            <Image
                                src="/icons/coin-color.svg"
                                alt="Coin"
                                fill
                                sizes="(max-width: 640px) 20px, 32px"
                                className="object-contain"
                            />
                        </div>
                        <span className="text-lg font-bold text-white sm:text-2xl">
                            +{coinsEarned}
                        </span>
                    </div>
                    {coinBoost > 0 && (
                        <span className="text-[10px] font-semibold text-[#4ade80] md:text-sm">
                            (+{coinBoost}%)
                        </span>
                    )}
                </div>

                {/* Divider */}
                <div className="mt-1 h-5 w-px rounded-full bg-white/30 sm:mt-2 sm:h-8" />

                {/* Trophy */}
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="relative h-5 w-5 shrink-0 sm:h-8 sm:w-8">
                            <Image
                                src="/icons/trophy-color.svg"
                                alt="Trophy"
                                fill
                                sizes="(max-width: 640px) 20px, 32px"
                                className="object-contain"
                            />
                        </div>
                        <span className="text-lg font-bold text-white sm:text-2xl">
                            {trophyWon > 0 ? `+${trophyWon}` : trophyWon}
                        </span>
                    </div>
                    {trophyBoost > 0 && (
                        <span className="text-xs font-semibold text-[#4ade80] md:text-sm">
                            (+{trophyBoost}%)
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
