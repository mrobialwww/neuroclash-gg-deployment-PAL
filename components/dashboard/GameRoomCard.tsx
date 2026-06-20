"use client";

import React, { useState } from "react";
import { Users, Flag } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils/utils";
import { OverlayJoinCard } from "@/components/dashboard/OverlayJoinCard";
import { AvatarCircles } from "@/components/dashboard/AvatarCircles";
import { GameRoomWithPlayerCount } from "@/types/GameRoom";
import { MockUser } from "@/types/MockUser";

interface GameRoomCardProps {
    room: GameRoomWithPlayerCount;
    onClick?: () => void;
    className?: string;
}

const FALLBACK_IMAGE = "/quiz-category/default.webp";

function resolveImage(src: string | null | undefined, error: boolean): string {
    return error || !src ? FALLBACK_IMAGE : src;
}

export function GameRoomCard({ room, onClick, className }: GameRoomCardProps) {
    const [open, setOpen] = useState(false);
    const [imgError, setImgError] = useState(false);

    const progress = Math.min((room.player_count / room.max_player) * 100, 100);
    const displayTitle = room.title || room.category;

    // Map participant avatar URLs into MockUser objects for AvatarCircles
    const avatarUsers: MockUser[] = (room.participants_avatars ?? [])
        .slice(0, 4)
        .map((data, idx) => ({
            id: String(idx),
            name: `Pemain ${idx + 1}`,
            character: data.character,
            image: data.image,
        }));

    const handleClick = () => {
        setOpen(true);
        onClick?.();
    };

    return (
        <>
            <div
                className={cn(
                    "group flex w-full cursor-pointer flex-col items-center rounded-2xl border border-gray-50 bg-white p-5 pb-6 shadow-[0_4px_25px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_35px_rgba(0,0,0,0.08)]",
                    className,
                )}
                onClick={handleClick}
            >
                {/* Center Icon Container */}
                <div className="relative mb-2 mt-1 flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white shadow-lg transition-transform duration-300 group-hover:scale-105">
                    <Image
                        src={resolveImage(room.image_url, imgError)}
                        alt={displayTitle}
                        fill
                        sizes="128px"
                        className="object-contain"
                        priority
                        onError={() => setImgError(true)}
                    />
                </div>

                {/* Title */}
                <h3 className="min-h-10 mb-2 flex items-center justify-center px-1 text-center text-xl font-extrabold leading-tight text-[#555555]">
                    {displayTitle}
                </h3>

                {/* Progress Bar */}
                <div className="mb-5 h-2.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                    <div
                        className="h-full rounded-full bg-[#256AF4] transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Footer Stats Row */}
                <div className="mt-auto flex w-full items-center justify-between">
                    {/* Participant Character Avatars (max 4) */}
                    {avatarUsers.length > 0 ? (
                        <AvatarCircles
                            items={avatarUsers}
                            avatarSize={44}
                            maxItems={4}
                            className="md:pl-1"
                        />
                    ) : (
                        <div />
                    )}

                    {/* Player count & round count */}
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                            <Users
                                size={22}
                                className="mb-0.5 text-[#256AF4] opacity-80"
                            />
                            <span className="text-sm font-bold text-[#555555]">
                                {room.player_count}/{room.max_player}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <Flag
                                size={22}
                                className="mb-0.5 text-[#256AF4] opacity-80"
                            />
                            <span className="text-sm font-bold text-[#555555]">
                                {room.total_round}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {open && (
                <OverlayJoinCard room={room} onClose={() => setOpen(false)} />
            )}
        </>
    );
}

export function GameRoomCardSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "flex w-full flex-col items-center rounded-2xl border border-gray-50 bg-white p-5 pb-6 shadow-[0_4px_25px_rgba(0,0,0,0.05)]",
                className,
            )}
        >
            {/* Center Icon Skeleton */}
            <div className="relative mb-2 mt-1 flex h-32 w-32 shrink-0 animate-pulse items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-200 shadow-lg" />

            {/* Title Skeleton */}
            <div className="min-h-10 mb-2 mt-2 w-3/4 animate-pulse rounded-md bg-gray-200" />

            {/* Progress Bar Skeleton */}
            <div className="mb-5 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-gray-200" />
            </div>

            {/* Footer Stats Row Skeleton */}
            <div className="mt-auto flex w-full items-center justify-between">
                {/* AvatarCircles Skeleton */}
                <div className="flex -space-x-3">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-[44px] w-[44px] animate-pulse rounded-full border-2 border-white bg-gray-200"
                        />
                    ))}
                </div>

                {/* Player & round stats skeleton */}
                <div className="flex items-center gap-3">
                    <div className="h-10 w-8 animate-pulse rounded-md bg-gray-200" />
                    <div className="h-10 w-8 animate-pulse rounded-md bg-gray-200" />
                </div>
            </div>
        </div>
    );
}
