"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getCharacterBgColor } from "@/lib/constants/characters";
import { cn } from "@/lib/utils/utils";
import { MockUser as User } from "@/types/MockUser";

interface Player extends User {
    health: number;
    maxHealth: number;
}

interface PlayerCardProps {
    player: Player;
    isMe?: boolean;
    isOpponent?: boolean;
    hideHealthBar?: boolean;
    className?: string;
}

export const PlayerCard = ({
    player,
    isMe = false,
    isOpponent = false,
    hideHealthBar = false,
    className,
}: PlayerCardProps) => {
    const healthPercentage = (player.health / player.maxHealth) * 100;

    // Suppress the transition animation on the very first render
    const isMounted = useRef(false);
    const [enableTransition, setEnableTransition] = useState(false);

    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            // Allow one frame to paint with the initial width before enabling
            // transition so subsequent HP changes animate smoothly
            const raf = requestAnimationFrame(() => {
                setEnableTransition(true);
            });
            return () => cancelAnimationFrame(raf);
        }
    }, []);

    return (
        <div
            className={cn(
                // Mobile: Horizontal layout | Desktop (lg): Vertical Card layout
                "relative flex w-full items-center gap-3 rounded-xl border-white/10 shadow-2xl backdrop-blur-md lg:max-w-[240px] lg:flex-col lg:gap-0 lg:border-2 lg:bg-[#D9D9D9]/20 lg:p-4",
                isMe ? "flex-row" : "flex-row-reverse lg:flex-col",
                isOpponent && "border-4 border-yellow-500 shadow-yellow-500/50",
                className,
            )}
        >
            {/* Avatar Section */}
            <div
                className={cn(
                    "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-lg transition-all duration-300",
                    "h-12 w-12 md:h-14 md:w-14 lg:mb-4 lg:h-20 lg:w-20",
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
                        sizes="(max-width: 768px) 56px, 80px"
                        className="object-contain"
                        priority
                    />
                </div>
            </div>

            {/* Info Section (Name, Bar, Role) */}
            <div
                className={cn(
                    "flex flex-1 flex-col lg:w-full",
                    isMe
                        ? "items-start lg:items-center"
                        : "items-end lg:items-center",
                )}
            >
                {/* Name */}
                <h3
                    className={cn(
                        "max-w-[120px] truncate text-xs font-semibold tracking-tight text-white md:max-w-[150px] md:text-sm lg:max-w-[180px] lg:text-lg",
                        !isMe && "text-right lg:text-center",
                    )}
                >
                    {player.name}
                </h3>

                {/* HP Bar Section - Hidden in Solo mode for opponent */}
                {!hideHealthBar && (
                    <div className="relative my-1 h-3 w-full overflow-hidden rounded-full border border-white/20 bg-[#1A1B23] shadow-inner md:h-4 lg:mb-2">
                        <div
                            className={cn(
                                "h-full bg-[#22C55E] shadow-[0_0_10px_rgba(94,211,106,0.5)]",
                                enableTransition &&
                                    "transition-[width] duration-300 ease-out",
                            )}
                            style={{ width: `${healthPercentage}%` }}
                        />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <span className="text-[8px] font-semibold text-white md:text-[10px] lg:text-xs">
                                HP: {player.health}/{player.maxHealth}
                            </span>
                        </div>
                    </div>
                )}

                {/* Role Label */}
                <p className="md:text-md text-sm font-medium text-white">
                    {isMe ? "(Kamu)" : "(Lawan)"}
                </p>
            </div>
        </div>
    );
};
