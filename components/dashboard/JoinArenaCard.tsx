"use client";

import { useState } from "react";
import Image from "next/image";
import { TextFieldWithButton } from "@/components/common/TextFieldWithButton";
import { ToastOverlay } from "@/components/common/ToastOverlay";
import { OverlayJoinCard } from "@/components/dashboard/OverlayJoinCard";
import { GameRoomWithPlayerCount } from "@/types/GameRoom";

export interface JoinArenaCardProps {
    rankName: string;
    rankScore: number;
    rankImageUrl: string;
}

export function JoinArenaCard({
    rankName,
    rankScore,
    rankImageUrl,
}: JoinArenaCardProps) {
    const [roomToJoin, setRoomToJoin] =
        useState<GameRoomWithPlayerCount | null>(null);
    const [toastData, setToastData] = useState<{
        isOpen: boolean;
        code: string;
    }>({
        isOpen: false,
        code: "",
    });

    const handleJoinByCode = async (code: string) => {
        if (!code) return;

        try {
            const resp = await fetch(`/api/game-rooms/code/${code}`, {
                credentials: "include",
            });
            const result = await resp.json();

            // API contract: { data: GameRoom[] } — ambil elemen pertama
            const rooms = result.data ?? [];
            if (resp.ok && rooms.length > 0) {
                setRoomToJoin({ ...rooms[0], player_count: 0 });
            } else {
                setToastData({ isOpen: true, code });
            }
        } catch (error) {
            console.error("Error joining room:", error);
            setToastData({ isOpen: true, code });
        }
    };

    return (
        <div>
            <div className="relative flex h-full min-h-[220px] w-full flex-col items-center justify-between overflow-hidden rounded-3xl border border-white bg-[#140B29] bg-[radial-gradient(circle_at_center,rgba(253,169,40,0.8)_0%,rgba(253,169,40,0.3)_30%,transparent_70%)] p-5 text-center shadow-[0_4px_20px_rgba(253,169,40,0.1)] md:min-h-[240px] md:p-8">
                <div className="z-10 mb-2 flex w-full flex-col items-center">
                    <h2 className="mb-2 text-3xl font-bold text-white drop-shadow-md md:text-4xl">
                        Gabung ke Arena
                    </h2>

                    {/* Badge image */}
                    <div className="relative z-10 mb-2 flex h-28 w-28 items-center justify-center md:h-32 md:w-32">
                        <Image
                            src={rankImageUrl}
                            alt={`${rankName} Badge`}
                            fill
                            className="z-10 object-contain drop-shadow-lg"
                            sizes="(max-width: 768px) 150px, 200px"
                            priority
                        />
                    </div>

                    {/* Rank indicator */}
                    <div className="relative z-10 mx-auto mb-2 box-border flex w-full max-w-[320px] items-center justify-center overflow-hidden px-4 font-bold text-white">
                        {/* Gambar Latar */}
                        <div className="relative flex h-auto w-full items-center justify-center">
                            <Image
                                src="/dashboard/trophy-badge.webp"
                                alt="Rank Badge Background"
                                width={320}
                                height={60}
                                className="-z-10 block h-full w-full object-contain drop-shadow-sm"
                                sizes="(max-width: 320px) 100vw, 320px"
                                priority
                            />

                            {/* Konten Teks */}
                            <div className="absolute inset-0 flex items-center justify-center gap-2 px-3 sm:gap-4 sm:px-6">
                                <span className="sm:text-md overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold uppercase tracking-wide text-[#FFDFB3] drop-shadow-sm">
                                    {rankName}
                                </span>
                                <span className="sm:text-md text-sm text-white/80">
                                    |
                                </span>
                                <div className="flex items-center gap-1 text-[#FFD700] sm:gap-1.5">
                                    <div className="relative mb-0.5 h-3 w-3 shrink-0 sm:h-4 sm:w-4">
                                        <Image
                                            src="/icons/trophy-color.svg"
                                            alt="Trophy"
                                            fill
                                            sizes="16px"
                                            className="object-contain"
                                        />
                                    </div>
                                    <span className="sm:text-md mb-0.5 whitespace-nowrap text-sm font-bold leading-none tracking-wide drop-shadow-sm">
                                        {rankScore}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Input & Button group */}
                <TextFieldWithButton
                    name="arenaCode"
                    placeholder="Masukkan Kode Arena"
                    buttonContent="Gabung"
                    wrapperClassName="z-10 w-full max-w-sm"
                    onSubmit={handleJoinByCode}
                />
            </div>

            {roomToJoin && (
                <OverlayJoinCard
                    room={roomToJoin}
                    onClose={() => setRoomToJoin(null)}
                />
            )}

            <ToastOverlay
                isOpen={toastData.isOpen}
                code={toastData.code}
                onClose={() =>
                    setToastData((prev) => ({ ...prev, isOpen: false }))
                }
            />
        </div>
    );
}

export function JoinArenaCardSkeleton() {
    return (
        <div className="relative flex h-full min-h-[220px] w-full flex-col items-center justify-between overflow-hidden rounded-3xl border border-white/20 bg-[#140B29]/80 p-5 text-center shadow-[0_4px_20px_rgba(253,169,40,0.05)] md:min-h-[240px] md:p-8">
            <div className="z-10 mb-2 flex w-full flex-col items-center">
                {/* Title */}
                <div className="mb-2 h-9 w-48 animate-pulse rounded-md bg-white/20 md:h-10" />

                {/* Badge image */}
                <div className="relative z-10 mb-2 flex h-28 w-28 items-center justify-center md:h-32 md:w-32">
                    <div className="h-24 w-24 animate-pulse rounded-full bg-white/20 md:h-28 md:w-28" />
                </div>

                {/* Rank indicator */}
                <div className="relative z-10 mx-auto mb-2 box-border flex w-full max-w-[320px] items-center justify-center overflow-hidden px-4">
                    <div className="relative flex h-[60px] w-full animate-pulse items-center justify-center rounded-lg bg-white/10">
                        {/* Inner Content Skeleton */}
                        <div className="h-5 w-3/4 rounded-md bg-white/20" />
                    </div>
                </div>
            </div>

            {/* Input & Button group */}
            <div className="z-10 flex w-full max-w-sm gap-2">
                <div className="h-12 flex-1 animate-pulse rounded-xl bg-white/10" />
                <div className="h-12 w-28 animate-pulse rounded-xl bg-white/10" />
            </div>
        </div>
    );
}
