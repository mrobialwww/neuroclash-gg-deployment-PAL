"use client";

import React from "react";
import Image from "next/image";
import { PlayerGridCard } from "../match/PlayerGridCard";
import { MainButton } from "../common/MainButton";
import { Player } from "@/lib/constants/players";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils/utils";

export interface LobbyPlayer extends Player {
    isHost?: boolean;
    userGameId?: string;
    joinedAt?: string;
}

export interface LobbyRoomProps {
    roomCode: string;
    roomTitle: string;
    totalSlots: number;
    players: LobbyPlayer[];
    hostId: string;
    currentUserData?: { id: string; username: string; avatar: string } | null;
    /** true = solo mode (max_player === 1), false/undefined = multiplayer */
    isSolo?: boolean;
    /** true = user is the host of this logic */
    isHost?: boolean;
    /** Called when solo user or host clicks "Mulai" */
    onStart?: () => void;
    /** Loading state for start button */
    isLoading?: boolean;
    /** Is the user leaving? */
    isLeaving?: boolean;
    onLeave?: () => void;
}

export function LobbyRoom({
    roomCode,
    roomTitle,
    totalSlots,
    players,
    hostId,
    currentUserData,
    isSolo = false,
    isHost = false,
    onStart,
    isLoading = false,
    isLeaving = false,
    onLeave,
}: LobbyRoomProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // 2. Sorting Players: Me first, then Host, then others
    const sortedPlayers = [...players].sort((a, b) => {
        // Current user data is used to identify "Me"
        const isAMe = String(a.id) === currentUserData?.id;
        const isBMe = String(b.id) === currentUserData?.id;
        if (isAMe) return -1;
        if (isBMe) return 1;

        // Host second
        const isAHost = String(a.id) === hostId;
        const isBHost = String(b.id) === hostId;
        if (isAHost) return -1;
        if (isBHost) return 1;

        return 0;
    });

    return (
        <main className="relative flex min-h-screen w-full flex-col items-center overflow-x-hidden px-4 py-4 sm:px-8 md:px-16 lg:px-24">
            <div className="relative z-10 flex w-full max-w-[1400px] flex-col items-center gap-6 md:gap-8">
                {/* Header - Consistent with Match/Starbox */}
                <header className="flex w-full items-center justify-between pt-4">
                    {!isSolo ? (
                        <div className="rounded-lg bg-[#A6A6A6]/40 px-4 py-2 text-sm font-bold tracking-widest text-white backdrop-blur-xl md:px-6 md:text-base">
                            {roomCode}
                        </div>
                    ) : (
                        <div /> // placeholder for center alignment if needed, or just let justify-between work
                    )}

                    <MainButton
                        variant="white"
                        onClick={onLeave}
                        disabled={isLeaving}
                        className="h-9 cursor-pointer px-4 text-sm font-bold md:px-6 md:text-base lg:h-10"
                    >
                        {isLeaving ? "Keluar..." : "Keluar"}
                    </MainButton>
                </header>

                {/* Central Avatar Section */}
                <div className="animate-in fade-in zoom-in flex flex-col items-center gap-3 text-center duration-500 md:gap-4">
                    <div className="group relative mb-2 h-28 w-28 sm:h-32 sm:w-32 md:mb-4  md:h-40 md:w-40">
                        <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-3xl transition-all duration-700 group-hover:bg-blue-400/30" />
                        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-4 border-white/60 bg-white/10 shadow-2xl backdrop-blur-md">
                            <Image
                                src={
                                    currentUserData?.avatar ??
                                    "/default/Slime.webp"
                                }
                                alt="Profile"
                                width={120}
                                height={120}
                                className="h-[85%] w-[85%] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col items-center">
                        <h1 className="text-center text-lg font-bold text-white drop-shadow-xl sm:text-xl md:text-2xl lg:text-3xl">
                            {isSolo
                                ? "Kamu bisa berlatih mengerjakan quiz ini secara mandiri."
                                : isHost
                                ? "Bagikan kode room di bawah ke teman-temanmu!"
                                : "Menunggu Host Memulai Pertandingan..."}
                        </h1>
                        {!isSolo && isHost && (
                            <button
                                onClick={handleCopy}
                                className="group mt-2 flex items-center justify-center gap-2 rounded-full border border-white/10 bg-[#D9D9D9]/20 px-5 py-2.5 text-sm font-bold text-white shadow-lg backdrop-blur-sm transition-all hover:bg-[#D9D9D9]/30 active:scale-95 md:text-base"
                            >
                                <span className="uppercase tracking-wide opacity-90 group-hover:opacity-100">
                                    {roomCode}
                                </span>
                                <div className="rounded-full bg-white/20 p-1 md:p-1.5">
                                    {copied ? (
                                        <Check
                                            size={16}
                                            strokeWidth={3}
                                            className="text-green-300"
                                        />
                                    ) : (
                                        <Copy size={16} />
                                    )}
                                </div>
                            </button>
                        )}
                    </div>

                    <div className="inline-flex items-center rounded-lg bg-[#003186]/60 px-4 py-1.5 backdrop-blur-md md:px-6 md:py-2">
                        <span className="text-base font-semibold text-white md:text-lg">
                            Materi: {roomTitle}
                        </span>
                    </div>
                </div>

                {/* Player List Section */}
                <div className="flex w-full flex-col gap-3">
                    <div className="flex items-center justify-between px-1 sm:px-2">
                        <h2 className="text-lg font-bold text-white md:text-xl">
                            Daftar Pemain
                        </h2>
                        <span className="text-md font-medium text-white sm:text-lg">
                            {players.length} / {totalSlots}
                        </span>
                    </div>

                    <div className="w-full rounded-2xl border-2 border-white/10 bg-[#D9D9D9]/10 px-2 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-md sm:px-4 md:py-4">
                        {/* Auto-fill grid: kolom dihitung otomatis dari lebar container */}
                        <div
                            className="grid gap-x-3 gap-y-6"
                            style={{
                                gridTemplateColumns:
                                    "repeat(auto-fill, minmax(105px, 1fr))",
                            }}
                        >
                            {sortedPlayers.map((player) => {
                                const isMe =
                                    String(player.id) === currentUserData?.id;
                                const isHost = String(player.id) === hostId;

                                return (
                                    <div
                                        key={player.id}
                                        className="flex justify-center"
                                    >
                                        <PlayerGridCard
                                            player={player}
                                            hideHealthBar={true}
                                            highlight={
                                                isMe && isHost
                                                    ? "self-host"
                                                    : isMe
                                                    ? "self"
                                                    : isHost
                                                    ? "host"
                                                    : undefined
                                            }
                                            lobbyMode
                                        />
                                    </div>
                                );
                            })}

                            {/* Empty Slots */}
                            {Array.from({
                                length: Math.max(
                                    0,
                                    Math.min(10, totalSlots) - players.length,
                                ),
                            }).map((_, i) => {
                                const globalIndex = players.length + i;
                                const visibilityClass =
                                    globalIndex >= 8
                                        ? "hidden md:flex"
                                        : globalIndex >= 6
                                        ? "hidden sm:flex"
                                        : "flex";

                                return (
                                    <div
                                        key={`empty-${i}`}
                                        className={cn(
                                            "justify-center",
                                            visibilityClass,
                                        )}
                                    >
                                        <div className="flex w-[88px] flex-col items-center gap-2 py-3 opacity-20 sm:w-[100px] md:w-[110px]">
                                            <div className="md:w-18 md:h-18 flex h-14 w-14 items-center justify-center rounded-full border-4 border-dashed border-white/40 sm:h-16 sm:w-16">
                                                <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                                            </div>
                                            <div className="h-3 w-10 rounded-full bg-white/20" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <div className="w-full max-w-md pb-8">
                    {isSolo ? (
                        <MainButton
                            variant="green"
                            hasShadow
                            className="w-full rounded-xl py-5 text-lg font-bold"
                            onClick={onStart}
                            disabled={isLoading}
                        >
                            {isLoading ? "Memuat..." : "Mainkan Sekarang"}
                        </MainButton>
                    ) : isHost ? (
                        <MainButton
                            variant="green"
                            hasShadow
                            className="w-full rounded-xl py-5 text-lg font-bold"
                            onClick={onStart}
                            disabled={
                                isLoading || (!isSolo && players.length < 4)
                            }
                        >
                            {isLoading
                                ? "Memuat..."
                                : !isSolo && players.length < 4
                                ? "Minimal 4 Pemain"
                                : "Mulai Pertandingan"}
                        </MainButton>
                    ) : (
                        <MainButton
                            variant="white"
                            className="w-full cursor-not-allowed rounded-xl py-5 text-lg font-bold opacity-60"
                            disabled
                        >
                            Menunggu Host...
                        </MainButton>
                    )}
                </div>
            </div>
        </main>
    );
}
