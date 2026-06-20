"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { MainButton } from "@/components/common/MainButton";
import { MatchProgressBar } from "@/components/match/MatchProgressBar";
import { QuestionCard } from "@/components/match/QuestionCard";
import { PlayerList } from "@/components/match/PlayerList";
import { BuffList } from "@/components/match/BuffList";
import { PlayerCard } from "@/components/match/PlayerCard";
import { EliminationOverlay } from "@/components/game/EliminationOverlay";
import {
    BuffEffectOverlay,
    BuffEffectType,
} from "@/components/match/BuffEffectOverlay";
import NextImage from "next/image";

import {
    useMatchStore,
    SECONDS_PER_ROUND,
    STARBOX_INTERVAL,
} from "@/store/useMatchStore";
import { createClient } from "@/lib/supabase/client";
import { useStarboxStore } from "@/store/useStarboxStore";
import { calculateDuration, parseDBDate } from "@/lib/utils/dateUtils";

export default function GamePage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const [isProcessingEndgame, setIsProcessingEndgame] = React.useState(false);

    const gameRoomId = params.room_id as string;
    const roomCodeQuery = searchParams.get("code") ?? gameRoomId;
    const initialRound = parseInt(searchParams.get("nextRound") ?? "1", 10);
    const userGameId = searchParams.get("ugid") ?? null;

    // Elimination overlay state
    const [showEliminationOverlay, setShowEliminationOverlay] = useState(false);
    const [eliminationData, setEliminationData] = useState<{
        placement: number;
        win: number;
        lose: number;
        trophyWon: number;
        coinsEarned: number;
        coinBoost: number;
        trophyBoost: number;
        survivalTime: string;
        isWinner: boolean;
        deathRound?: number;
    } | null>(null);
    const [hasShownOverlay, setHasShownOverlay] = useState(false);
    const [isLoadingEliminationData, setIsLoadingEliminationData] =
        useState(false);

    // State untuk animasi buff ability
    const [buffEffect, setBuffEffect] = useState<BuffEffectType>(null);

    const {
        roomCode,
        roomInfo,
        currentOrder,
        totalQuestions,
        currentQuestion,
        isLoadingQuestion,
        selectedAnswerId,
        isSubmitting,
        isFinished,
        timeLeft,
        players,
        currentUser,
        currentBattleRoom,
        opponentIds,
        firstAnswerPlayerId,
        firstAnswerId,
        nextRoundUrl,
        error,
        isWaitingForAllBattles,
        lastAnswerCorrect,
        correctAnswerId,
        initializeMatch,
        handleSelectAnswer,
        decrementTimer,
        isOpponent,
        canAnswer,
    } = useMatchStore();

    const { myInventory, refreshMyInventory } = useStarboxStore();

    const activeStepIndex = ((currentOrder - 1) % STARBOX_INTERVAL) + 1;
    const isSolo = roomInfo?.max_player === 1;

    // 1. Initialize Match Room Data + hydrate inventory dari DB (termasuk ability_materials)
    useEffect(() => {
        initializeMatch(roomCodeQuery, gameRoomId, initialRound);
    }, [initializeMatch, roomCodeQuery, gameRoomId, initialRound]);

    // 1b. Hydrate inventory dari DB agar ability_materials tersedia untuk OverlayMaterialCard
    useEffect(() => {
        if (currentUser?.id && gameRoomId) {
            refreshMyInventory(gameRoomId, currentUser.id);
        }
    }, [currentUser?.id, gameRoomId, refreshMyInventory]);

    // Handle Error (Ongoing room or not found)
    useEffect(() => {
        if (error) {
            alert(error);
            router.push("/dashboard");
        }
    }, [error, router]);

    // Navigation Guard
    useEffect(() => {
        window.history.pushState(null, "", window.location.href);
        const handlePopState = () => {
            window.history.pushState(null, "", window.location.href);
        };
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    // Handle Async Navigation
    useEffect(() => {
        if (nextRoundUrl) {
            router.push(nextRoundUrl);
            useMatchStore.setState({ nextRoundUrl: null });
        }
    }, [nextRoundUrl, router]);

    // Check if current user died and show elimination overlay
    const checkElimination = useCallback(async () => {
        if (!currentUser || !gameRoomId || hasShownOverlay || isSolo) return;
        if (isLoadingEliminationData) return;

        const currentPlayer = players.find((p) => p.id === currentUser.id);

        // Check if player is dead
        if (
            currentPlayer &&
            !currentPlayer.is_alive &&
            currentPlayer.health <= 0
        ) {
            try {
                setIsLoadingEliminationData(true);
                const supabase = createClient();

                // Show loading state, then fetch data after delay to ensure user_games is updated
                await new Promise((resolve) => setTimeout(resolve, 1500));

                // Fetch live results from API instead of direct DB query to avoid race conditions
                console.log(
                    `[GamePage] Fetching live results for elimination: ${gameRoomId}`,
                );
                const res = await fetch(`/api/endgame/${gameRoomId}`, {
                    cache: "no-store",
                });
                const json = await res.json();

                if (!json.success || !json.data) {
                    throw new Error("Failed to fetch live endgame results");
                }

                const allResults = json.data;
                const myResult = allResults.find(
                    (r: any) => r.userId === currentUser.id,
                );

                if (!myResult) {
                    throw new Error("User results not found in live data");
                }

                // Calculate survival time accurately from match start
                // 1. Prefer matchStartTime from store (set when round 1 initializes)
                // 2. Fallback to room's updated_at (start time)
                // 3. Last fallback to now (0 duration)
                const matchStartTime = useMatchStore.getState().matchStartTime;
                const matchStart =
                    matchStartTime ??
                    parseDBDate(roomInfo?.updated_at || roomInfo?.created_at);
                const survivalTime = calculateDuration(matchStart, Date.now());

                setEliminationData({
                    placement: myResult.placement,
                    win: myResult.win,
                    lose: myResult.lose,
                    trophyWon: myResult.trophyWon,
                    coinsEarned: myResult.coinsEarned,
                    coinBoost: myResult.coinBoost || 0,
                    trophyBoost: myResult.trophyBoost || 0,
                    survivalTime: myResult.survivalTime || survivalTime,
                    isWinner: myResult.placement === 1,
                    deathRound: myResult.deathRound,
                });

                setShowEliminationOverlay(true);
                setHasShownOverlay(true);
                setIsLoadingEliminationData(false);
            } catch (err) {
                console.error("Error fetching elimination data:", err);
                setIsLoadingEliminationData(false);
            }
        }
    }, [
        currentUser,
        gameRoomId,
        hasShownOverlay,
        isSolo,
        players,
        isLoadingEliminationData,
    ]);

    useEffect(() => {
        checkElimination();
    }, [checkElimination, players]);

    // Fetch elimination data when game is finished (for end screen)
    const fetchEndGameData = useCallback(async () => {
        if (!currentUser || !gameRoomId || eliminationData) return;

        try {
            // Fetch live results from API
            console.log(
                `[GamePage] Fetching live results for end game: ${gameRoomId}`,
            );
            const res = await fetch(`/api/endgame/${gameRoomId}`, {
                cache: "no-store",
            });
            const json = await res.json();

            if (!json.success || !json.data) return;

            const myResult = json.data.find(
                (r: any) => r.userId === currentUser.id,
            );
            if (!myResult) return;

            // Calculate time accurately
            const matchStartTime = useMatchStore.getState().matchStartTime;
            const matchStart =
                matchStartTime ??
                parseDBDate(roomInfo?.updated_at || roomInfo?.created_at);
            const survivalTime = calculateDuration(matchStart, Date.now());

            setEliminationData({
                placement: myResult.placement,
                win: myResult.win,
                lose: myResult.lose,
                trophyWon: myResult.trophyWon,
                coinsEarned: myResult.coinsEarned,
                coinBoost: myResult.coinBoost || 0,
                trophyBoost: myResult.trophyBoost || 0,
                survivalTime: myResult.survivalTime || survivalTime,
                isWinner: myResult.placement === 1,
                deathRound: myResult.deathRound,
            });
        } catch (err) {
            console.error("Error fetching end game data:", err);
        }
    }, [currentUser, gameRoomId, eliminationData, roomInfo]);

    useEffect(() => {
        if (isFinished && !eliminationData) {
            fetchEndGameData();
        }
    }, [isFinished, fetchEndGameData, eliminationData]);

    // 2. Local Timer
    useEffect(() => {
        if (isLoadingQuestion || isFinished || error) return;

        const timer = setInterval(() => {
            decrementTimer();
        }, 1000);

        return () => clearInterval(timer);
    }, [isLoadingQuestion, isFinished, decrementTimer, error, timeLeft]);

    // 3. Mapping Players for UI
    const { meCard, opponentCard, sortedForList } = useMemo(() => {
        const meData = players.find((p) => p.id === currentUser?.id);
        const others = players.filter((p) => p.id !== currentUser?.id);

        // Gunakan opponentIds dari battle room untuk menentukan lawan
        const battleOpponents = opponentIds
            .map((oppId) => players.find((p) => p.id === oppId))
            .filter((p): p is (typeof players)[0] => p !== undefined);

        const enemyData =
            battleOpponents.length > 0 ? battleOpponents[0] : null;

        const mapToCard = (p: any) =>
            p
                ? {
                      id: p.id,
                      name: p.name,
                      character: p.character || "Slime",
                      image: p.image,
                      health: p.health,
                      maxHealth: 100,
                  }
                : null;

        // Prof. Bubu card untuk Solo mode (lawan)
        const profBubuCard = isSolo
            ? {
                  id: "prof-bubu",
                  name: "Prof. Bubu",
                  character: "Prof. Bubu",
                  image: "/mascot/mascot-match.webp",
                  health: 100,
                  maxHealth: 100,
              }
            : null;

        // Solo fallback: jika players belum terisi, gunakan data currentUser
        const soloMeCard =
            isSolo && !meData && currentUser
                ? {
                      id: currentUser.id,
                      name: currentUser.username,
                      character: currentUser.character,
                      image: currentUser.avatar || "/default/slime.webp",
                      health: 100,
                      maxHealth: 100,
                  }
                : null;

        return {
            meCard: mapToCard(meData) ?? soloMeCard,
            opponentCard: isSolo ? profBubuCard : mapToCard(enemyData),
            sortedForList: players.map((p) => ({
                id: p.id,
                name: p.name,
                character: p.character || "Slime",
                image: p.image,
                health: p.health,
                maxHealth: 100,
                isMe: p.id === currentUser?.id,
                isOpponent: opponentIds.includes(p.id),
            })),
        };
    }, [players, currentUser, opponentIds, isSolo]);

    // 4. Answer Action Dispatcher
    const onSelectAnswer = (answerId: string) => {
        if (!currentUser) return;
        handleSelectAnswer(currentUser.id, answerId);
    };

    // Exit handler
    const handleExit = async () => {
        if (userGameId) {
            await fetch(`/api/user-game/leave/${userGameId}`, {
                method: "DELETE",
                credentials: "include",
            });
        }
        router.push("/dashboard");
    };

    const handleGoToEndgame = async () => {
        if (isProcessingEndgame) return;
        setIsProcessingEndgame(true);

        try {
            // Trigger centralized server-side reward processing
            // This is idempotent and ensures all players get their rewards calculated correctly.
            await fetch("/api/game/endgame", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ game_room_id: gameRoomId }),
                credentials: "include",
            });

            // Redirect to the actual endgame results page
            router.push(`/endgame/${gameRoomId}`);
        } catch (err) {
            console.error("[GamePage] Failed to trigger endgame rewards:", err);
            // Fail-safe: transition to endgame page anyway as the server might have already processed it.
            router.push(`/endgame/${gameRoomId}`);
        }
    };

    // Tampilan ketika Error
    if (error) {
        return (
            <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6">
                {/* Background Decorative */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/10 blur-[100px]" />

                <div className="animate-in fade-in zoom-in-95 relative flex w-full max-w-[400px] flex-col items-center gap-6 rounded-2xl border-2 border-red-500/30 bg-[#040619]/60 p-8 text-center shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl duration-200">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500/20 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                        <span className="text-3xl text-red-500">×</span>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-extrabold uppercase tracking-wider text-white">
                            Terjadi Kesalahan
                        </h2>
                        <p className="text-sm font-medium text-white/60">
                            {error}
                        </p>
                    </div>
                    <MainButton
                        variant="blue"
                        className="h-12 w-full font-bold uppercase tracking-wider"
                        onClick={() => window.location.reload()}
                    >
                        Coba Lagi
                    </MainButton>
                </div>
            </main>
        );
    }

    // Tampilan ketika Loading Data
    if (isLoadingQuestion && !currentQuestion) {
        return (
            <main className="relative flex min-h-screen w-full flex-col items-center justify-center space-y-4">
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[100px]" />
                <div className="relative flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#3D79F3] border-t-transparent shadow-[0_0_15px_rgba(61,121,243,0.3)]" />
                    <p className="animate-pulse text-lg font-semibold uppercase tracking-widest text-white">
                        Memuat Arena...
                    </p>
                </div>
            </main>
        );
    }

    // Tampilan ketika Menunggu Semua Battle Room Selesai
    if (isWaitingForAllBattles && !error) {
        return (
            <div className="z-100 fixed inset-0 flex items-center justify-center bg-black/40 px-6 backdrop-blur-md">
                <div className="animate-in fade-in zoom-in-95 relative flex w-full max-w-[400px] flex-col items-center gap-6 rounded-2xl border-2 border-[#383347] bg-[#040619]/60 p-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl duration-200">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#3D79F3] border-t-transparent shadow-[0_0_20px_rgba(61,121,243,0.3)]" />
                    <div className="space-y-3">
                        <p className="text-xl font-extrabold uppercase tracking-tighter text-white md:text-2xl ">
                            Menunggu...
                        </p>
                        <p className="text-sm font-medium text-white/60 md:text-base">
                            Ronde {currentOrder} segera berakhir.
                            <br />
                            Pertempuran lain masih berlangsung!
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Tampilan Layar Kemenangan / Selesai
    if (isFinished) {
        const isWinner = eliminationData?.isWinner;
        const finalImage = isWinner
            ? "/mascot/mascot-match.webp"
            : "/mascot/mascot-failed.webp";
        const titleColor = isWinner
            ? "text-white"
            : "text-[#FF0000] drop-shadow-[0_2px_4px_rgba(255,0,0,0.3)]";

        return (
            <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4">
                {/* Background Decorative Elements */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[120px]" />

                <div className="animate-in fade-in zoom-in-95 relative flex w-full max-w-[440px] flex-col items-center gap-6 rounded-3xl border-2 border-[#383347] bg-[#040619]/60 p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-xl duration-300 md:p-10">
                    {/* Title */}
                    <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                        Quiz Selesai!
                    </h1>

                    {/* Icon/Mascot */}
                    <div className="relative h-[120px] w-[120px] drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] md:h-[160px] md:w-[160px]">
                        <NextImage
                            src="/mascot/mascot-match.webp"
                            alt="Result Mascot"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>

                    {/* Subtitle */}
                    <div className="space-y-2">
                        <p className="text-base font-semibold leading-tight text-white md:text-xl">
                            {isWinner
                                ? "Kamu memenangkan pertandingan!"
                                : `Pertandingan telah berakhir!`}
                        </p>
                        <p className="text-sm font-medium text-white/70 md:text-base">
                            Kamu telah menyelesaikan{" "}
                            {eliminationData?.deathRound ??
                                totalQuestions ??
                                currentOrder}{" "}
                            soal.
                        </p>
                    </div>

                    {/* Stats Box */}
                    {eliminationData && (
                        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner">
                            <div className="grid grid-cols-4 gap-2">
                                <div className="flex flex-col items-center">
                                    <span className="text-lg font-bold text-[#4ade80] md:text-xl">
                                        {eliminationData.win}
                                    </span>
                                    <span className="text-xs font-semibold tracking-wide text-white/70">
                                        Menang
                                    </span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-lg font-bold text-[#f87171] md:text-xl">
                                        {eliminationData.lose}
                                    </span>
                                    <span className="text-xs font-semibold tracking-wide text-white/70">
                                        Kalah
                                    </span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span
                                        className={`text-lg font-bold md:text-xl ${
                                            eliminationData.trophyWon >= 0
                                                ? "text-[#4ade80]"
                                                : "text-[#f87171]"
                                        }`}
                                    >
                                        {eliminationData.trophyWon >= 0
                                            ? "+"
                                            : ""}
                                        {eliminationData.trophyWon}
                                    </span>
                                    <span className="text-xs font-semibold tracking-wide text-white/70">
                                        Trofi
                                    </span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span
                                        className={`text-lg font-bold md:text-xl ${
                                            eliminationData.coinsEarned >= 0
                                                ? "text-[#fbbf24]"
                                                : "text-[#f87171]"
                                        }`}
                                    >
                                        {eliminationData.coinsEarned >= 0
                                            ? "+"
                                            : ""}
                                        {eliminationData.coinsEarned}
                                    </span>
                                    <span className="text-xs font-semibold tracking-wide text-white/70">
                                        Koin
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Placement & Time Badge */}
                    {eliminationData && (
                        <div className="flex w-full flex-col items-center gap-3">
                            <div className="bg-linear-to-r rounded-full from-[#658BFF] to-[#3D79F3] px-6 py-2 shadow-lg shadow-blue-500/20">
                                <span className="text-lg font-bold tracking-tight text-white">
                                    Peringkat {eliminationData.placement}
                                </span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-sm font-semibold text-white/70">
                                    Waktu Bertahan
                                </span>
                                <span className="text-xl font-bold text-white">
                                    {Math.floor(
                                        parseInt(
                                            eliminationData.survivalTime.split(
                                                ":",
                                            )[0],
                                        ),
                                    )}{" "}
                                    Menit{" "}
                                    {parseInt(
                                        eliminationData.survivalTime.split(
                                            ":",
                                        )[1],
                                    )}{" "}
                                    Detik
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Action Button */}
                    <MainButton
                        variant="blue"
                        size="lg"
                        hasShadow
                        className="mt-2 h-10 w-full text-lg font-bold md:h-12"
                        onClick={handleGoToEndgame}
                        isLoading={isProcessingEndgame}
                        disabled={isProcessingEndgame}
                    >
                        Lihat Hasil
                    </MainButton>
                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen w-full flex-col items-center gap-4 overflow-x-hidden px-4 py-6 sm:px-8 md:px-12">
            {/* Header Info */}
            <header className="mb-2 flex w-full max-w-[1400px] items-center justify-between">
                <div className="rounded-lg bg-[#A6A6A6]/40 px-2 py-1.5 text-sm font-semibold text-white backdrop-blur-xl md:px-4 md:text-base lg:px-6">
                    {roomCode}
                </div>

                <div className="block flex-1 px-2 md:px-4 lg:px-10">
                    <MatchProgressBar
                        key={`round-${currentOrder}`}
                        duration={SECONDS_PER_ROUND}
                        timeLeft={timeLeft}
                        activeStepIndex={activeStepIndex}
                        isSolo={isSolo}
                    />
                </div>

                <MainButton
                    variant="white"
                    className="h-8 shrink-0 px-2 text-sm md:px-4 md:text-base lg:h-9 lg:px-6"
                    onClick={handleExit}
                >
                    Keluar
                </MainButton>
            </header>

            {/* Round indicator */}
            <p className="text-sm font-medium text-white/50">
                Soal {currentOrder}
                {totalQuestions ? ` / ${totalQuestions}` : ""}
            </p>

            {/* Arena Wrapper */}
            <div className="flex w-full flex-1 items-start justify-center">
                <div className="grid w-full max-w-[1400px] grid-cols-2 items-stretch gap-x-4 gap-y-6 md:gap-6 lg:grid-cols-[210px_minmax(600px,1fr)_210px]">
                    {/* My Player Card / Kiri */}
                    <div className="order-1 flex h-full flex-col justify-end gap-4 self-stretch lg:order-1">
                        <div className="relative hidden min-h-[160px] flex-1 overflow-hidden lg:block">
                            <div className="absolute inset-0">
                                <BuffList
                                    buffs={myInventory}
                                    className="h-full"
                                    onAbilityUsed={(type) =>
                                        setBuffEffect(type)
                                    }
                                />
                            </div>
                        </div>
                        <div className="w-full max-w-[320px] shrink-0 lg:max-w-none">
                            {meCard ? (
                                <PlayerCard
                                    player={meCard as any}
                                    isMe={true}
                                    className="w-full"
                                />
                            ) : (
                                <div className="h-[90px] w-full" />
                            )}
                        </div>
                    </div>

                    {/* Opponent Player Card / Kanan */}
                    <div className="order-2 flex h-full flex-col items-end justify-end gap-4 self-stretch lg:order-3 lg:items-stretch">
                        <div className="relative hidden min-h-[160px] flex-1 overflow-hidden lg:block">
                            <div className="absolute inset-0">
                                {/* Always pass empty array for players in Solo to trigger the empty state text */}
                                <PlayerList
                                    players={
                                        isSolo ? [] : (sortedForList as any)
                                    }
                                    className="h-full"
                                />
                            </div>
                        </div>
                        <div className="w-full max-w-[320px] shrink-0 lg:max-w-none">
                            {opponentCard ? (
                                <PlayerCard
                                    player={opponentCard as any}
                                    isMe={false}
                                    hideHealthBar={isSolo}
                                    className="w-full"
                                />
                            ) : (
                                <div className="h-[90px] w-full" />
                            )}
                        </div>
                    </div>

                    {/* Kolom Tengah Utama — Area Pertanyaan */}
                    <div className="isolate order-3 col-span-2 mt-2 flex flex-col lg:order-2 lg:col-span-1 lg:mt-0">
                        {currentQuestion && (
                            <>
                                {firstAnswerPlayerId && (
                                    <div className="mb-4 text-center font-semibold text-yellow-400">
                                        {
                                            players.find(
                                                (p) =>
                                                    p.id ===
                                                    firstAnswerPlayerId,
                                            )?.name
                                        }{" "}
                                        menjawab pertama!
                                    </div>
                                )}
                                <QuestionCard
                                    question={currentQuestion.question_text}
                                    options={currentQuestion.options}
                                    onSelect={onSelectAnswer}
                                    selectedId={selectedAnswerId}
                                    disabled={canAnswer() === false}
                                    canAnswer={canAnswer}
                                    firstAnswerId={firstAnswerId}
                                    correctAnswerId={correctAnswerId}
                                    lastAnswerCorrect={lastAnswerCorrect}
                                    className="h-auto w-full"
                                />
                            </>
                        )}
                    </div>

                    {/* Mobile Layout */}
                    <div className="order-4 col-span-1 lg:hidden">
                        <BuffList
                            buffs={myInventory}
                            className="h-[200px] w-full sm:h-[240px]"
                        />
                    </div>

                    <div className="order-5 col-span-1 lg:hidden">
                        <PlayerList
                            players={sortedForList as any}
                            className="h-[200px] w-full sm:h-[240px]"
                        />
                    </div>
                </div>
            </div>

            {/* Elimination Overlay */}
            {(showEliminationOverlay || isLoadingEliminationData) && (
                <EliminationOverlay
                    isOpen={showEliminationOverlay || isLoadingEliminationData}
                    onClose={() => setShowEliminationOverlay(false)}
                    placement={eliminationData?.placement || 0}
                    win={eliminationData?.win || 0}
                    lose={eliminationData?.lose || 0}
                    trophyWon={eliminationData?.trophyWon || 0}
                    coinsEarned={eliminationData?.coinsEarned || 0}
                    coinBoost={eliminationData?.coinBoost || 0}
                    trophyBoost={eliminationData?.trophyBoost || 0}
                    survivalTime={eliminationData?.survivalTime || "00:00"}
                    isWinner={eliminationData?.isWinner || false}
                    isLoading={isLoadingEliminationData}
                />
            )}

            {/* Buff Ability Animation Overlay */}
            <BuffEffectOverlay
                type={buffEffect}
                onComplete={() => setBuffEffect(null)}
            />
        </main>
    );
}
