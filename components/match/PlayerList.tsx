"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/utils";
import { PlayerItem } from "./PlayerItem";
import { MockUser as User } from "@/types/MockUser";

interface Player extends User {
    health: number;
    maxHealth: number;
    isMe?: boolean;
}

interface PlayerListProps {
    players: Player[];
    className?: string;
}

export const PlayerList = ({ players, className }: PlayerListProps) => {
    return (
        <div
            className={cn(
                "relative flex w-full flex-col items-center rounded-2xl border-2 border-white/10 bg-[#D9D9D9]/20 px-4 py-2 shadow-2xl backdrop-blur-md sm:px-8 lg:px-2",
                className,
            )}
        >
            {/* Header Badge */}
            <div className="relative mb-3 flex h-[35px] w-full max-w-[180px] items-center justify-center md:h-[40px]">
                <Image
                    src="/match/match-badge.webp"
                    alt="Daftar Pemain Badge"
                    fill
                    sizes="(max-width: 768px) 180px, 200px"
                    className="object-contain"
                    priority
                />
                <h2 className="relative z-10 mt-0.5 text-xs font-semibold tracking-tight text-white md:text-base">
                    Daftar Pemain
                </h2>
            </div>

            {/* Players List Container */}
            <div className="scrollbar-hide flex w-full flex-1 flex-col overflow-y-auto pb-2">
                {players.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center p-4 text-center text-sm font-medium text-white/50">
                        Tidak ada pemain lain di room ini
                    </div>
                ) : (
                    <div className="mx-auto w-full max-w-[240px] space-y-1.5">
                        {players.map((player) => (
                            <PlayerItem key={player.id} player={player} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
