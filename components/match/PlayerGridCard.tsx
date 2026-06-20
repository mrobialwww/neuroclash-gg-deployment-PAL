"use client";

import Image from "next/image";
import { getCharacterBgColor } from "@/lib/constants/characters";
import { cn } from "@/lib/utils/utils";
import { Player } from "@/lib/constants/players";

interface PlayerGridCardProps {
    player: Player;
    className?: string;
    hideHealthBar?: boolean;
    highlight?: "self" | "host" | "self-host";
    lobbyMode?: boolean;
    hasPicked?: boolean;
    isActiveTurn?: boolean;
    progress?: number;
    progressColor?: string;
}

export const PlayerGridCard = ({
    player,
    className,
    hideHealthBar = false,
    highlight,
    lobbyMode = false,
    hasPicked = false,
    isActiveTurn = false,
    progress = 0,
    progressColor = "bg-[#FDBB38]/80",
}: PlayerGridCardProps) => {
    const healthPercentage = (player.health / player.maxHealth) * 100;

    // Border avatar selalu putih
    const borderColor = "border-white/80";

    const glowEffect = isActiveTurn
        ? "shadow-[0_0_15px_rgba(255,204,0,0.8)]"
        : highlight === "self" || highlight === "self-host"
        ? "shadow-[0_0_15px_rgba(37,106,244,0.6)]"
        : highlight === "host"
        ? "shadow-[0_0_15px_rgba(255,0,9,0.6)]"
        : "shadow-lg";

    // bg card: biru 256AF4/50 untuk Kamu, merah FF0009/50 untuk Host
    const cardBgColor = isActiveTurn
        ? highlight === "self" || highlight === "self-host"
            ? "bg-[#D46B1D]/50"
            : "bg-[#FDBB38]/30"
        : highlight === "self" || highlight === "self-host"
        ? "bg-[#256AF4]/50"
        : highlight === "host"
        ? "bg-[#FF0009]/50"
        : "bg-transparent";

    return (
        <div
            className={cn(
                "relative flex flex-col items-center gap-2 overflow-hidden rounded-xl shadow-lg transition-all duration-300",
                lobbyMode
                    ? "w-[100px] px-1 py-3 sm:w-[110px] md:w-[125px]"
                    : "w-full min-w-[100px] px-1 py-3 md:min-w-[130px]",
                cardBgColor,
                hasPicked ? "opacity-60 grayscale" : "",
                isActiveTurn
                    ? "ring-2 ring-white/50"
                    : "border border-white/10",
                className,
            )}
        >
            {/* Progress Background Layer (Turn Timer) */}
            {isActiveTurn && progress > 0 && (
                <div
                    className={cn(
                        "absolute bottom-0 left-0 z-0 h-full transition-all duration-100 ease-linear",
                        progressColor,
                    )}
                    style={{ width: `${progress}%` }}
                />
            )}

            {/* Content wrapper with z-index */}
            <div className="relative z-10 flex w-full flex-col items-center gap-2">
                {/* Avatar Section */}
                <div
                    className={cn(
                        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-4 transition-all duration-300",
                        "h-16 w-16 md:h-20 md:w-20",
                        borderColor,
                        glowEffect,
                    )}
                    style={{
                        backgroundColor: getCharacterBgColor(player.character),
                    }}
                >
                    <div className="relative flex h-[75%] w-[75%] items-center justify-center">
                        <Image
                            src={player.image || "/default/Slime.webp"}
                            alt={player.character || "Player"}
                            fill
                            sizes="(max-width: 768px) 64px, 80px"
                            className="object-contain drop-shadow-md"
                            priority
                        />
                    </div>

                    {/* Picked Overlay & Checklist */}
                    {hasPicked && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#161616]/70">
                            <Image
                                src="/icons/checklist.svg"
                                alt="Checked"
                                width={40}
                                height={40}
                                className="h-8 w-8 text-[#5DE2E7] md:h-10 md:w-10"
                            />
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="flex w-full flex-col items-center gap-1">
                    {/* HP Bar - Only show if not hidden */}
                    {!hideHealthBar && (
                        <div className="group relative h-2 w-full overflow-hidden rounded-full border border-white/10 bg-[#1A1B23] shadow-inner md:h-3">
                            <div
                                className={cn(
                                    "h-full shadow-[0_0_8px_rgba(94,211,106,0.3)] transition-all duration-300",
                                    "bg-[#22C55E]",
                                )}
                                style={{ width: `${healthPercentage}%` }}
                            />
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-100 transition-opacity">
                                <span className="text-[6px] font-bold uppercase tracking-tight text-white md:text-[8px]">
                                    HP:{player.health}/{player.maxHealth}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Name & Badge */}
                    <div className="flex w-full flex-col items-center">
                        <h3 className="w-full truncate text-center text-[11px] font-bold tracking-tight text-white drop-shadow-md md:text-sm">
                            {player.name}
                            {highlight && (
                                <span className="block text-[9px] font-medium tracking-tight text-white/90 md:text-[10px]">
                                    (
                                    {highlight === "self"
                                        ? "Kamu"
                                        : highlight === "host"
                                        ? "Host"
                                        : "Kamu/Host"}
                                    )
                                </span>
                            )}
                        </h3>
                    </div>
                </div>
            </div>
        </div>
    );
};
