import Image from "next/image";
import { getCharacterBgColor } from "@/lib/constants/characters";

export interface PodiumPlayer {
    userId: string;
    username: string;
    characterImage: string;
    baseCharacter: string;
    placement: 1 | 2 | 3;
}

interface PodiumProps {
    players: PodiumPlayer[];
}

function PodiumFigure({ player }: { player: PodiumPlayer }) {
    // Layout order: 2nd (left), 1st (center), 3rd (right)
    const bgColor = getCharacterBgColor(player.baseCharacter);

    return (
        <div className="flex flex-col items-center gap-1">
            {/* Username */}
            <span className="max-w-[100px] truncate text-center text-sm font-bold text-white drop-shadow-md sm:max-w-[120px] sm:text-base md:max-w-[140px] md:text-lg">
                {player.username}
            </span>

            {/* Character avatar */}
            <div
                className={`relative h-20 w-20 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] sm:h-28 sm:w-28 md:h-36 md:w-36`}
            >
                <Image
                    src={player.characterImage}
                    alt={player.baseCharacter}
                    fill
                    sizes="112px"
                    className="object-contain"
                />
            </div>
        </div>
    );
}

export function EndgamePodium({ players }: PodiumProps) {
    const first = players.find((p) => p.placement === 1);
    const second = players.find((p) => p.placement === 2);
    const third = players.find((p) => p.placement === 3);

    return (
        <div className="relative w-full">
            {/* Container with aspect ratio to maintain alignment with image hotspots */}
            <div className="aspect-2/1 relative mx-0 w-full max-w-6xl">
                {/* Podium background image as the base */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/match/podium.webp"
                        alt="Podium"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>

                {/* 2nd place (left) */}
                <div className="absolute bottom-[88%] left-[35%] z-10 -translate-x-1/2">
                    {second ? (
                        <PodiumFigure player={second} />
                    ) : (
                        <div className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32" />
                    )}
                </div>

                {/* 1st place (center, tallest) */}
                <div className="absolute bottom-[93%] left-[50%] z-10 -translate-x-1/2">
                    {first ? (
                        <PodiumFigure player={first} />
                    ) : (
                        <div className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32" />
                    )}
                </div>

                {/* 3rd place (right) */}
                <div className="absolute bottom-[85%] left-[65%] z-10 -translate-x-1/2">
                    {third ? (
                        <PodiumFigure player={third} />
                    ) : (
                        <div className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32" />
                    )}
                </div>
            </div>
        </div>
    );
}
