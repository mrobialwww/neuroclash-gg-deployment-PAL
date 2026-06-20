"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { getCharacterBgColor } from "@/lib/constants/characters";
import { cn } from "@/lib/utils/utils";
import { MockUser as User } from "@/types/MockUser";

interface Player extends User {
    health: number;
    maxHealth: number;
    isMe?: boolean;
    isOpponent?: boolean;
}

interface PlayerItemProps {
    player: Player;
    className?: string;
}

export const PlayerItem = ({ player, className }: PlayerItemProps) => {
    const healthPercentage = (player.health / player.maxHealth) * 100;

    return (
        <div
            className={cn(
                "relative flex w-full items-center justify-between gap-3 rounded-l-none rounded-r-full transition-all duration-300",
                player.isMe
                    ? "bg-linear-to-r from-[#E6AA00]/0 to-[#E6AA00] px-1"
                    : "bg-transparent",
                player.isOpponent &&
                    "bg-linear-to-r from-[#B40000]/0 to-[#B40000] px-1",
                className,
            )}
        >
            {/* Left Side: Name and Health Bar */}
            <div className="flex min-w-0 flex-1 flex-col items-end space-y-1 pl-2">
                <h3 className="w-full truncate text-right text-xs font-semibold leading-tight text-white md:text-sm">
                    {player.name} {player.isMe && "(Kamu)"}
                </h3>

                {/* Health Bar Container */}
                <div className="relative h-2 w-full overflow-hidden rounded-full border border-white/5 bg-black/40">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${healthPercentage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-[#22C55E]"
                    />
                </div>

                {/* Health Value with Icon */}
                <div className="flex w-full items-center justify-end gap-1">
                    <div className="relative h-3.5 w-3.5">
                        <Image
                            src="/icons/health.svg"
                            alt="HP"
                            fill
                            sizes="14px"
                            className="object-contain"
                        />
                    </div>
                    <span className="font-regular text-xs text-white/90 md:text-sm">
                        {player.health}
                    </span>
                </div>
            </div>

            {/* Right Side: Avatar */}
            <div
                className={cn(
                    "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white transition-all duration-300",
                    "h-[40px] w-[40px] md:h-[48px] md:w-[48px]",
                )}
                style={{
                    backgroundColor: getCharacterBgColor(player.character),
                }}
            >
                <div className="relative mt-1 flex h-[85%] w-[85%] items-center justify-center">
                    <Image
                        src={player.image}
                        alt={player.character}
                        fill
                        sizes="(max-width: 768px) 40px, 48px"
                        className="object-contain"
                    />
                </div>
            </div>
        </div>
    );
};
