"use client";

import Image from "next/image";
import { LeaderboardRankEntry } from "@/types";
import { LeaderboardRankCell } from "./LeaderboardRankCell";
import { LeaderboardAvatar } from "./LeaderboardAvatar";

interface LeaderboardRowProps {
    entry: LeaderboardRankEntry;
    isMe?: boolean;
}

function getRowStyle(position: number, isMe: boolean): React.CSSProperties {
    switch (position) {
        case 1:
            return {
                background:
                    "linear-gradient(90deg, #FDA928CC 0%, #97651800 100%)",
            };
        case 2:
            return {
                background:
                    "linear-gradient(90deg, #8D99C7CC 0%, #454B6100 100%)",
            };
        case 3:
            return {
                background:
                    "linear-gradient(90deg, #735131CC 0%, #D9995C00 100%)",
            };
        default:
            if (isMe) {
                return {
                    background: "#4D4D4D66",
                };
            }
            return {
                background: "#D9D9D933",
            };
    }
}

export function LeaderboardRow({ entry, isMe = false }: LeaderboardRowProps) {
    const rowStyle = getRowStyle(entry.position, isMe);

    return (
        <div
            className={`grid grid-cols-[80px_minmax(160px,1fr)_140px_140px] items-center gap-4 rounded-lg px-6 py-1 transition-all duration-200 md:gap-8 ${
                isMe ? "relative z-10 border border-white" : ""
            }`}
            style={rowStyle}
        >
            {/* Position */}
            <div className="flex items-center justify-center">
                {isMe && entry.position === 0 ? (
                    <span className="text-sm font-semibold text-white sm:text-base">
                        Tidak Ada
                    </span>
                ) : (
                    <LeaderboardRankCell position={entry.position} />
                )}
            </div>

            {/* Player */}
            <div className="flex min-w-0 items-center gap-3 md:gap-4">
                <LeaderboardAvatar
                    imageUrl={entry.character_image}
                    baseCharacter={entry.base_character}
                />
                <span
                    className={`text-md truncate font-medium md:text-lg ${
                        isMe ? "text-[#FDA928]" : "text-white"
                    }`}
                >
                    {entry.username}
                </span>
            </div>

            {/* Rank */}
            <div className="flex min-w-[80px] items-center justify-center gap-1.5 sm:min-w-[100px] sm:gap-2">
                {entry.rank ? (
                    <>
                        <div className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12 md:h-14 md:w-14">
                            <Image
                                src={entry.rank.image_url}
                                alt={entry.rank.name}
                                fill
                                sizes="(max-width: 768px) 48px, 56px"
                                className="object-contain drop-shadow-md"
                            />
                        </div>
                        <span className="text-md whitespace-nowrap font-medium text-[#BDCDFF] md:text-lg">
                            {entry.rank.name}
                        </span>
                    </>
                ) : (
                    <span className="text-xs text-white/50 sm:text-sm">-</span>
                )}
            </div>

            {/* Trophy */}
            <div className="flex min-w-[70px] items-center justify-center gap-1.5 sm:min-w-[80px]">
                <div className="relative h-5 w-5 shrink-0 sm:h-6 sm:w-6">
                    <Image
                        src="/icons/trophy-color.svg"
                        alt="Trophy"
                        fill
                        sizes="24px"
                        className="object-contain"
                    />
                </div>
                <span className="text-md font-medium tabular-nums text-[#FDA928] md:text-lg">
                    {entry.total_trophy.toLocaleString("id-ID")}
                </span>
            </div>
        </div>
    );
}
