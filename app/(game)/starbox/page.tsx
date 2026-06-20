"use client";

import React, { useEffect, useCallback, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import NextImage from "next/image";
import { MainButton } from "@/components/common/MainButton";
import { AbilityCard } from "@/components/match/AbilityCard";
import { PlayerGridCard } from "@/components/match/PlayerGridCard";
import { cn } from "@/lib/utils/utils";
import { useStarboxStore } from "@/store/useStarboxStore";

const steps = [
    { id: "book", icon: "/icons/book.svg" },
    { id: "battle-1", icon: "/icons/battle.svg" },
    { id: "battle-2", icon: "/icons/battle.svg" },
    { id: "battle-3", icon: "/icons/battle.svg" },
    { id: "battle-4", icon: "/icons/battle.svg" },
    { id: "battle-5", icon: "/icons/battle.svg" },
    { id: "treasure", icon: "/icons/treasure.svg" },
];

const TURN_DURATION_MS = 4000;
const PROGRESS_TICK_MS = 50;

export default function StarboxPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const roomId = searchParams.get("roomId") ?? "";
    const code = searchParams.get("code") ?? "---";
    const nextRound = searchParams.get("nextRound") ?? "6";

    const {
        roomInfo,
        players,
        abilities,
        pickingAbilityId,
        isLoading,
        isHost,
        myPlayerId,
        pickedPlayerIds,
        currentTurnIndex,
        initGameData,
        selectAbility,
        autoAssignRemaining,
        cleanup,
        reset,
    } = useStarboxStore();

    // ── 1. Initial Data Fetching
    useEffect(() => {
        initGameData(code, roomId, nextRound);
        return () => cleanup();
    }, [code, roomId, initGameData, cleanup, nextRound]);

    const handleNextRound = useCallback(() => {
        router.push(`/game/${roomId}?code=${code}&nextRound=${nextRound}`);
    }, [router, roomId, code, nextRound]);

    const handleExit = () => {
        reset();
        router.push("/dashboard");
    };

    // ── 2. Derived state (event-driven, dari Zustand `currentTurnIndex`) ───
    const allTurnsDone =
        players.length > 0 && currentTurnIndex >= players.length;
    const isMyTurn =
        roomInfo?.max_player !== 1 &&
        currentTurnIndex < players.length &&
        !!players[currentTurnIndex]?.isMe;
    const iHavePicked = myPlayerId
        ? pickedPlayerIds.includes(myPlayerId)
        : false;

    const [isPreDelay, setIsPreDelay] = useState(true);
    const [preCountdown, setPreCountdown] = useState(3);
    const [progress, setProgress] = useState(0);
    const [turnCountdown, setTurnCountdown] = useState(TURN_DURATION_MS / 1000);
    const autoPickedThisTurn = useRef(false);

    // Initial delay timer
    useEffect(() => {
        if (isLoading || !isPreDelay) return;
        const timer = setInterval(() => {
            setPreCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setIsPreDelay(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isLoading, isPreDelay]);

    // Turn timer
    const turnSkippedThisRender = useRef(false);
    useEffect(() => {
        if (isPreDelay || allTurnsDone || isLoading) {
            setProgress(0);
            setTurnCountdown(TURN_DURATION_MS / 1000);
            return;
        }

        // Reset saat giliran berganti
        setProgress(0);
        setTurnCountdown(TURN_DURATION_MS / 1000);
        autoPickedThisTurn.current = false;
        turnSkippedThisRender.current = false;
        const startTime = Date.now();

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min(100, (elapsed / TURN_DURATION_MS) * 100);
            const remaining = Math.max(
                0,
                Math.ceil((TURN_DURATION_MS - elapsed) / 1000),
            );
            setProgress(pct);
            setTurnCountdown(remaining);

            // Timer habis → lanjut giliran berikutnya (paksa host trigger broadcast skip turn)
            if (elapsed >= TURN_DURATION_MS && !turnSkippedThisRender.current) {
                turnSkippedThisRender.current = true; // Tanda giliran sudah di-skip untuk interval ini

                // Hanya host yang skip turn jika waku habis untuk menjaga konsistensi state terpusat
                if (useStarboxStore.getState().isHost) {
                    useStarboxStore.getState().triggerSkipTurn();
                }
            }
        }, PROGRESS_TICK_MS);

        return () => clearInterval(interval);
    }, [currentTurnIndex, allTurnsDone, isLoading, roomId, isPreDelay]);

    // ── 4. Auto-transition: semua giliran selesai → redirect
    const autoAssignDone = useRef(false);

    useEffect(() => {
        if (!allTurnsDone || isLoading || !roomInfo || autoAssignDone.current)
            return;
        autoAssignDone.current = true;

        if (isHost) {
            autoAssignRemaining(roomId).then(async () => {
                try {
                    await fetch("/api/starbox/abilities/init", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            gameRoomId: roomId,
                            totalPlayer: players.length,
                            shouldResetDb: true,
                        }),
                    });
                } catch (err) {
                    console.error(
                        "Gagal inisialisasi abilities dari host:",
                        err,
                    );
                }
                setTimeout(() => handleNextRound(), 1500);
            });
        } else {
            setTimeout(() => handleNextRound(), 2500);
        }
    }, [
        allTurnsDone,
        isLoading,
        roomInfo,
        isHost,
        roomId,
        autoAssignRemaining,
        handleNextRound,
        players.length,
    ]);

    // ── 5. Click handler
    const handleUserClickAbility = useCallback(
        (abilityId: string) => {
            const totalStock = abilities.reduce((sum, a) => sum + a.stock, 0);
            if (totalStock <= 0 || pickingAbilityId) return;

            const soloUserId = myPlayerId || players[currentTurnIndex]?.id;
            if (roomInfo?.max_player === 1) {
                if (!soloUserId) {
                    console.warn(
                        "[StarboxPage] Solo mode missing user id for ability selection",
                    );
                    return;
                }
                selectAbility(roomId, abilityId, soloUserId);
                setTimeout(() => handleNextRound(), 800);
                return;
            }

            if (isMyTurn && !iHavePicked) {
                autoPickedThisTurn.current = true; // Mark that manual pick done
                selectAbility(roomId, abilityId, players[currentTurnIndex]?.id);
                // We NO LONGER call triggerSkipTurn here to allow timer to finish
            }
        },
        [
            abilities,
            pickingAbilityId,
            roomInfo,
            roomId,
            players,
            currentTurnIndex,
            selectAbility,
            handleNextRound,
            isMyTurn,
            iHavePicked,
            myPlayerId,
        ],
    );

    const remainingItems = abilities.reduce((sum, a) => sum + a.stock, 0);
    const activeStepIndex = 6;
    const canPickAbility =
        roomInfo?.max_player === 1 ||
        (!isPreDelay && isMyTurn && !iHavePicked && !pickingAbilityId);

    // ── Loading screen
    if (isLoading) {
        return (
            <main className="flex min-h-screen w-full flex-col items-center justify-center space-y-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#3D79F3] border-t-transparent" />
                <p className="animate-pulse text-lg font-semibold text-white">
                    Menyiapkan Starbox...
                </p>
            </main>
        );
    }

    // ── Main UI
    return (
        <main className="relative flex min-h-screen w-full flex-col items-center overflow-x-hidden px-4 py-6 pt-4 md:px-8 md:pt-6 lg:px-12">
            <div className="max-w-350 relative z-10 flex w-full flex-col items-center gap-8 pb-8">
                {/* Header */}
                <header className="mb-2 flex w-full items-center justify-between">
                    <div className="rounded-lg bg-[#A6A6A6]/40 px-2 py-1.5 text-sm font-semibold text-white backdrop-blur-xl md:px-4 md:text-base lg:px-6">
                        {code}
                    </div>

                    <div className="flex flex-1 justify-center gap-2 px-4 sm:gap-4 md:gap-6">
                        {steps.map((step, index) => {
                            const isActive = index === activeStepIndex;
                            return (
                                <div
                                    key={step.id}
                                    className="relative flex flex-col items-center"
                                >
                                    <div
                                        className={cn(
                                            "relative flex h-5 w-5 items-center justify-center transition-all duration-500 md:h-6 md:w-6",
                                            isActive
                                                ? "text-[#FFCC00]"
                                                : "text-white/40",
                                        )}
                                    >
                                        <div
                                            className="h-[18px] w-[18px] bg-current md:h-[20px] md:w-[20px]"
                                            style={{
                                                maskImage: `url(${step.icon})`,
                                                WebkitMaskImage: `url(${step.icon})`,
                                                maskRepeat: "no-repeat",
                                                WebkitMaskRepeat: "no-repeat",
                                                maskPosition: "center",
                                                WebkitMaskPosition: "center",
                                                maskSize: "contain",
                                                WebkitMaskSize: "contain",
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <MainButton
                        variant="white"
                        onClick={handleExit}
                        className="h-8 shrink-0 px-2 text-sm md:px-4 md:text-base lg:h-9 lg:px-6"
                    >
                        Keluar
                    </MainButton>
                </header>

                {/* Title Section */}
                <div className="flex flex-col items-center text-center">
                    <h1 className="text-balance text-xl font-bold tracking-tight text-white drop-shadow-lg md:text-2xl lg:text-3xl">
                        Takdir ada di tanganmu, pilih satu kekuatan!
                    </h1>

                    {roomInfo?.max_player !== 1 && (
                        <div className="mt-2 flex flex-col items-center gap-2">
                            {currentTurnIndex < players.length ? (
                                <p className="text-lg font-medium text-white/80">
                                    Giliran:{" "}
                                    <span
                                        className={
                                            players[currentTurnIndex]?.isMe
                                                ? "text-[#22C55E]"
                                                : "text-[#FFCB66]"
                                        }
                                    >
                                        {players[currentTurnIndex]?.isMe
                                            ? "Kamu"
                                            : players[currentTurnIndex]?.name}
                                    </span>
                                    <span className="ml-2 text-sm text-white/60">
                                        (HP terendah memilih lebih awal)
                                    </span>
                                </p>
                            ) : (
                                <p className="text-lg font-medium text-[#22C55E]">
                                    Semua pemain telah memilih! Menyiapkan babak
                                    selanjutnya...
                                </p>
                            )}

                            {iHavePicked && !allTurnsDone && (
                                <p className="text-sm font-medium text-white/50">
                                    Kamu sudah memilih. Menunggu pemain lain...
                                </p>
                            )}
                        </div>
                    )}

                    <p className="mt-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white/60">
                        Sisa Item Keseluruhan:{" "}
                        <span className="text-white">
                            {remainingItems} Terakhir
                        </span>
                    </p>
                </div>

                {/* Ability Selection Grid */}
                <div
                    className={cn(
                        "mx-auto flex w-full flex-wrap items-center justify-center gap-3 transition-all lg:gap-4",
                        !canPickAbility ? "pointer-events-none opacity-70" : "",
                    )}
                >
                    {abilities.map((ability) => {
                        const isBeingPickedByBot =
                            pickingAbilityId === ability.id;
                        return (
                            <div
                                key={ability.id}
                                className="md:w-45 lg:w-50 relative w-40 shrink-0 transition-all duration-300"
                            >
                                <AbilityCard
                                    name={ability.name}
                                    description={ability.description}
                                    image={ability.image}
                                    emptyImage={ability.emptyImage}
                                    stock={ability.stock}
                                    onClick={() =>
                                        handleUserClickAbility(ability.id)
                                    }
                                    className={
                                        isBeingPickedByBot
                                            ? "scale-105 rounded-lg ring-2 ring-white saturate-150"
                                            : ""
                                    }
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Player Grid Container (Multiplayer only) */}
                {roomInfo?.max_player !== 1 && (
                    <div className="max-w-300 relative mt-8 w-full overflow-visible rounded-3xl border border-white/10 bg-white/5 px-6 py-10 shadow-2xl backdrop-blur-md sm:px-8 lg:px-12">
                        {isPreDelay ? (
                            <div className="max-w-100 absolute -top-5 left-1/2 z-30 flex w-full -translate-x-1/2 items-center justify-center px-4">
                                <div className="relative flex h-auto w-full items-center justify-center">
                                    <NextImage
                                        src="/dashboard/trophy-badge.webp"
                                        alt="Badge Background"
                                        width={400}
                                        height={70}
                                        className="-z-10 block h-full w-full object-contain drop-shadow-xl"
                                        priority
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center px-4 md:px-8">
                                        <span className="text-center text-xs font-bold uppercase leading-tight text-white drop-shadow-md sm:text-sm md:text-base">
                                            Bersiap Mengambil Item...{" "}
                                            {preCountdown}s
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : isMyTurn && !iHavePicked ? (
                            <div className="max-w-100 absolute -top-5 left-1/2 z-30 flex w-full -translate-x-1/2 items-center justify-center px-4">
                                <div className="relative flex h-auto w-full items-center justify-center">
                                    <NextImage
                                        src="/dashboard/trophy-badge.webp"
                                        alt="Badge Background"
                                        width={400}
                                        height={70}
                                        className="-z-10 block h-full w-full object-contain drop-shadow-xl"
                                        priority
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center px-4 md:px-8">
                                        <span className="text-center text-xs font-bold uppercase leading-tight text-white drop-shadow-md sm:text-sm md:text-base">
                                            Sekarang giliran kamu untuk memilih
                                            kekuatan!
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div
                            className="grid gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12"
                            style={{
                                gridTemplateColumns:
                                    "repeat(auto-fill, minmax(110px, 1fr))",
                            }}
                        >
                            {players.map((player, idx) => {
                                const isActiveTurn = currentTurnIndex === idx;
                                const hasPicked = pickedPlayerIds.includes(
                                    player.id,
                                );

                                return (
                                    <div
                                        key={`${player.id}-${idx}`}
                                        className="w-full"
                                    >
                                        <PlayerGridCard
                                            player={player}
                                            hideHealthBar={false}
                                            highlight={
                                                player.isMe ? "self" : undefined
                                            }
                                            hasPicked={hasPicked}
                                            isActiveTurn={
                                                isActiveTurn &&
                                                !allTurnsDone &&
                                                !isPreDelay
                                            }
                                            progress={
                                                isActiveTurn &&
                                                !allTurnsDone &&
                                                !isPreDelay
                                                    ? progress
                                                    : 0
                                            }
                                            progressColor={
                                                player.isMe
                                                    ? "bg-[#D46B1D]/80"
                                                    : "bg-[#FDBB38]/80"
                                            }
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
