import { create } from "zustand";
import { GameRoomWithPlayerCount } from "@/types/GameRoom";
import { PlayerMatchState, QuizQuestion } from "@/types/quiz";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserNavbarData } from "@/hooks/useUserClient";
import { BattleRoom } from "@/modules/battles/battle.schema";

const supabase = createClient();

export const SECONDS_PER_ROUND = 15;
export const STARBOX_INTERVAL = 5;
export const INITIAL_ROUND = 1;

export interface MatchState {
    roomCode: string;
    gameRoomId: string;
    roomInfo: GameRoomWithPlayerCount | null;
    currentOrder: number;
    totalQuestions: number | null;
    currentQuestion: QuizQuestion | null;
    isLoadingQuestion: boolean;
    selectedAnswerId: string | null;
    isSubmitting: boolean;
    isFinished: boolean;
    timeLeft: number;
    players: PlayerMatchState[];
    currentUser: {
        id: string;
        username: string;
        avatar: string;
        character: string;
    } | null;
    currentBattleRoom: BattleRoom | null;
    opponentIds: string[];
    firstAnswerPlayerId: string | null;
    firstAnswerId: string | null;
    nextRoundUrl: string | null;
    error: string | null;
    isWaitingForAllBattles: boolean;
    isAdvancingRound: boolean;
    isSyncingPlayers: boolean;
    lastAnswerCorrect: boolean | null;
    correctAnswerId: string | null;
    matchStartTime: number | null;
    initializeMatch: (
        roomCode: string,
        gameRoomId: string,
        initialRound: number,
    ) => Promise<void>;
    loadQuestion: (gameRoomId: string, order: number) => Promise<void>;
    advanceRound: () => void;
    waitForAllBattlesAndAdvance: () => Promise<void>;
    handleSelectAnswer: (userId: string, answerId: string) => Promise<void>;
    decrementTimer: () => void;
    resetMatch: () => void;
    syncPlayersFromDB: (roomId: string) => Promise<void>;
    syncBattleRoomFromDB: () => Promise<void>;
    setupRealtimeSubscription: (roomId: string) => void;
    isOpponent: (playerId: string) => boolean;
    canAnswer: () => boolean;
}

export const useMatchStore = create<MatchState>((set, get) => ({
    roomCode: "",
    gameRoomId: "",
    roomInfo: null,
    currentOrder: 1,
    totalQuestions: null,
    currentQuestion: null,
    isLoadingQuestion: true,
    selectedAnswerId: null,
    isSubmitting: false,
    isFinished: false,
    timeLeft: SECONDS_PER_ROUND,
    players: [],
    currentUser: null,
    currentBattleRoom: null,
    opponentIds: [],
    firstAnswerPlayerId: null,
    firstAnswerId: null,
    nextRoundUrl: null,
    error: null,
    isWaitingForAllBattles: false,
    isAdvancingRound: false,
    isSyncingPlayers: false,
    lastAnswerCorrect: null,
    correctAnswerId: null,
    matchStartTime: null,

    isOpponent: (playerId: string) => {
        return get().opponentIds.includes(playerId);
    },

    canAnswer: () => {
        const state = get();
        const isSolo = state.roomInfo?.max_player === 1;

        // Solo mode: only needs currentUser and no previous answer
        if (isSolo) {
            return !!(
                state.currentUser &&
                !state.selectedAnswerId &&
                !state.isSubmitting
            );
        }

        // Cannot answer if:
        // 1. No current user
        // 2. No battle room
        // 3. Already answered (selectedAnswerId is set)
        // 4. Already submitting
        // 5. Someone already answered in this battle room
        // 6. User is not a player in this battle room
        const isUserInBattleRoom =
            state.currentBattleRoom?.player1_id === state.currentUser?.id ||
            state.currentBattleRoom?.player2_id === state.currentUser?.id ||
            state.currentBattleRoom?.player3_id === state.currentUser?.id;

        return !!(
            state.currentUser &&
            state.currentBattleRoom &&
            !state.selectedAnswerId &&
            !state.isSubmitting &&
            isUserInBattleRoom &&
            !state.currentBattleRoom.first_answer_user_id
        );
    },

    initializeMatch: async (roomCode, gameRoomId, initialRound) => {
        console.log(
            `[MatchStore] initializeMatch called: ${gameRoomId}, round: ${initialRound}`,
        );

        // Reset semua flag dari ronde/fase sebelumnya agar state bersih.
        // Penting saat kembali dari Starbox — flag lama bisa menyebabkan
        // canAnswer() return false atau timer skip.
        set({
            isLoadingQuestion: true,
            error: null,
            currentQuestion: null,
            selectedAnswerId: null,
            isSubmitting: false,
            isAdvancingRound: false,
            isWaitingForAllBattles: false,
            isSyncingPlayers: false,
            isFinished: false,
            firstAnswerPlayerId: null,
            firstAnswerId: null,
            nextRoundUrl: null,
            lastAnswerCorrect: null,
            correctAnswerId: null,
            currentBattleRoom: null,
            opponentIds: [],
        });

        // Capture match start time if it's the first round
        if (initialRound === 1) {
            set({ matchStartTime: Date.now() });
        }

        try {
            // 1. Get Room Info first — fetch via API (store is client-side)
            let room: GameRoomWithPlayerCount | null = null;
            if (roomCode && roomCode !== gameRoomId) {
                const res = await fetch(`/api/game-rooms/code/${roomCode}`, { credentials: "include" });
                const json = await res.json();
                room = json.data?.[0] ?? json.data ?? null;
            }
            if (!room && gameRoomId) {
                const res = await fetch(`/api/game-rooms/${gameRoomId}`, { credentials: "include" });
                const json = await res.json();
                room = json.data?.[0] ?? json.data ?? null;
            }
            if (!room) {
                set({
                    error: "Room tidak ditemukan atau sudah tidak aktif.",
                    isLoadingQuestion: false,
                });
                return;
            }

            console.log(`[MatchStore] Room status: ${room.room_status}`);

            // 2. Get current user
            const user = await getCurrentUserNavbarData();
            if (user) {
                set({ currentUser: user });
            }

            set({
                roomCode,
                gameRoomId,
                roomInfo: room,
                totalQuestions: room.total_round || null,
                currentOrder: initialRound,
                timeLeft: SECONDS_PER_ROUND,
            });

            // 3. Sync Players & Start Subscriptions
            await get().syncPlayersFromDB(gameRoomId);
            get().setupRealtimeSubscription(gameRoomId);

            // 4. Multiplayer: generate battle rooms untuk ronde ini.
            //    Saat kembali dari Starbox, advanceRound (yang biasanya membuat battle rooms)
            //    tidak pernah dipanggil — sehingga battle rooms belum ada.
            //    Tanpa ini, currentBattleRoom = null → canAnswer() return false → tidak bisa klik.
            //    API ini idempotent (ada locking), aman dipanggil berulang.
            const isSolo = room.max_player === 1;
            if (!isSolo) {
                try {
                    console.log(
                        `[MatchStore] Generating battle rooms for round ${initialRound}...`,
                    );
                    const startRoundRes = await fetch(
                        "/api/match/start-round",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                game_room_id: gameRoomId,
                                round_number: initialRound,
                            }),
                            credentials: "include",
                        },
                    );

                    if (startRoundRes.ok) {
                        const result = await startRoundRes.json();
                        console.log(
                            `[MatchStore] Battle rooms ready for round ${initialRound}: ${
                                result.battleRooms?.length || 0
                            } rooms`,
                        );
                    } else {
                        const errorText = await startRoundRes.text();
                        // Handle common lock error as a warning (expected in concurrent join/refresh)
                        if (
                            errorText.includes(
                                "Another request is currently generating battle rooms",
                            ) ||
                            startRoundRes.status === 423
                        ) {
                            console.warn(
                                `[MatchStore] Battle room generation in progress by another request (Round ${initialRound}).`,
                            );
                        } else {
                            console.error(
                                `[MatchStore] Failed to generate battle rooms:`,
                                errorText,
                            );
                        }
                    }
                } catch (err) {
                    console.error(
                        `[MatchStore] Error generating battle rooms for round ${initialRound}:`,
                        err,
                    );
                }
            }

            // 5. Sync Battle Room for current user (sekarang pasti ada karena start-round sudah dipanggil)
            await get().syncBattleRoomFromDB();

            // 6. Load Question
            await get().loadQuestion(gameRoomId, initialRound);
        } catch (err) {
            console.error("Failed to initialize match:", err);
            set({ error: "Gagal memuat arena.", isLoadingQuestion: false });
        }
    },

    syncPlayersFromDB: async (roomId) => {
        const { isSyncingPlayers, isAdvancingRound } = get();

        // IMPORTANT: Skip sync if we're currently advancing round
        // This prevents excessive sync calls during round transition
        if (isAdvancingRound) {
            console.log(
                `[MatchStore] ⚠️ Skipping player sync - currently advancing round`,
            );
            return;
        }

        // Prevent infinite sync loops
        if (isSyncingPlayers) {
            console.log(`[MatchStore] ⚠️ Already syncing players, skipping`);
            return;
        }

        console.log(`[MatchStore] syncPlayersFromDB START - roomId: ${roomId}`);
        set({ isSyncingPlayers: true });

        try {
            const res = await fetch(`/api/match/participants/${roomId}`, {
                cache: "no-store",
                credentials: "include",
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error(
                    `[MatchStore] API error response text: ${errorText}`,
                );
                set({ isSyncingPlayers: false });
                return;
            }

            const { data } = await res.json();
            const players: PlayerMatchState[] = data || [];

            console.log(`[MatchStore] Synced ${players.length} players`);

            // Check if game should end (only 1 player alive)
            const alivePlayers = players.filter(
                (p) => p.is_alive && p.health > 0,
            );
            if (alivePlayers.length <= 1 && players.length > 1) {
                console.log(
                    `[MatchStore] Game ended! Only ${alivePlayers.length} player(s) alive.`,
                );
                set({ players, isFinished: true, isSyncingPlayers: false });
                return;
            }

            set({ players, isSyncingPlayers: false });
        } catch (err) {
            console.error("[MatchStore] Failed to sync players:", err);
            set({ isSyncingPlayers: false });
        }
    },

    syncBattleRoomFromDB: async () => {
        const { gameRoomId, currentUser, currentOrder } = get();

        if (!gameRoomId || !currentUser) {
            console.log(
                "[MatchStore] Cannot sync battle room - missing gameRoomId or currentUser",
            );
            return;
        }

        // Optimization: Skip sync if current player is eliminated
        const currentPlayer = get().players.find(
            (p) => p.id === currentUser.id,
        );
        if (
            currentPlayer &&
            (!currentPlayer.is_alive || currentPlayer.health <= 0)
        ) {
            console.log(
                `[MatchStore] Current player ${currentUser.id.substring(
                    0,
                    8,
                )} is eliminated - skipping battle room sync`,
            );
            set({ currentBattleRoom: null, opponentIds: [] });
            return;
        }

        try {
            const battleRes = await fetch(
                `/api/battle/my-room?game_room_id=${gameRoomId}&user_id=${currentUser.id}&round_number=${currentOrder}`,
            );
            const battleRoom: BattleRoom | null = battleRes.ok ? await battleRes.json() : null;

            if (battleRoom) {
                // Get opponent IDs from battle room
                const opponentIds = [
                    battleRoom.player1_id,
                    battleRoom.player2_id,
                    battleRoom.player3_id,
                ].filter(
                    (id): id is string => id !== null && id !== currentUser.id,
                );

                console.log(
                    `[MatchStore] Synced battle room with opponents:`,
                    opponentIds,
                );

                set({
                    currentBattleRoom: battleRoom,
                    opponentIds,
                    firstAnswerPlayerId: battleRoom.first_answer_user_id,
                    firstAnswerId: battleRoom.first_answer_id,
                });
            } else {
                console.log(
                    `[MatchStore] No battle room found for round ${currentOrder}`,
                );
                set({ currentBattleRoom: null, opponentIds: [] });
            }
        } catch (err) {
            console.error("[MatchStore] Failed to sync battle room:", err);
            set({ currentBattleRoom: null, opponentIds: [] });
        }
    },

    setupRealtimeSubscription: (roomId) => {
        const channel = supabase
            .channel(`room:${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "battle_rooms",
                    filter: `game_room_id=eq.${roomId}`,
                },
                async (payload) => {
                    // Sync battle room when updated (including first_answer changes)
                    console.log(`[MatchStore] Battle room updated:`, payload);
                    await get().syncBattleRoomFromDB();

                    // Don't auto-advance here - timer will handle it
                    // Just sync the battle room state
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "match_rounds",
                    filter: `game_room_id=eq.${roomId}`,
                },
                async (payload) => {
                    // Handle round changes
                    if (payload.eventType === "UPDATE") {
                        const { new: newRound, old: oldRound } = payload;
                        if (
                            oldRound.status === "waiting" &&
                            newRound.status === "ongoing"
                        ) {
                            // Round baru dimulai
                            await get().syncBattleRoomFromDB();
                            const state = get();
                            await get().loadQuestion(
                                roomId,
                                newRound.round_number,
                            );
                        }
                    }
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "user_answers",
                },
                async () => {
                    // Sync battle room when someone answers
                    await get().syncBattleRoomFromDB();
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "game_players",
                    filter: `game_room_id=eq.${roomId}`,
                },
                async (payload) => {
                    // Sync players when health is updated
                    // Check if we're not already syncing AND not currently advancing round
                    const { isSyncingPlayers, isAdvancingRound } = get();

                    // IMPORTANT: Skip sync if we're currently advancing round
                    // This prevents excessive sync calls during round transition
                    if (isAdvancingRound) {
                        console.log(
                            `[MatchStore] ⚠️ Skipping player sync (real-time) - currently advancing round`,
                        );
                        return;
                    }

                    // Prevent infinite sync loops
                    if (isSyncingPlayers) {
                        console.log(
                            `[MatchStore] ⚠️ Skipping real-time sync, already syncing`,
                        );
                        return;
                    }

                    console.log(
                        `[MatchStore] Game player health updated:`,
                        payload,
                    );
                    await get().syncPlayersFromDB(roomId);
                },
            )
            .on("broadcast", { event: "game_ended" }, (payload) => {
                console.log(
                    `[MatchStore] Game ended broadcast received:`,
                    payload,
                );
                set({ isFinished: true });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    loadQuestion: async (roomId, order) => {
        console.log(`[MatchStore] Loading question for round ${order}`);

        set({
            isLoadingQuestion: true,
            selectedAnswerId: null,
            firstAnswerId: null,
            firstAnswerPlayerId: null,
            timeLeft: SECONDS_PER_ROUND,
            nextRoundUrl: null,
            lastAnswerCorrect: null,
            correctAnswerId: null,
        });

        // Fetch question + answers via API (store is client-side)
        let question: QuizQuestion | null = null;
        const qRes = await fetch(`/api/quiz/questions/${roomId}?question_order=${order}`);
        const qJson = await qRes.json();
        const qData = Array.isArray(qJson?.data) ? qJson.data[0] : qJson?.data;
        if (qData?.question_id) {
            const aRes = await fetch(`/api/quiz/questions/answers/${qData.question_id}`);
            const aJson = await aRes.json();
            question = { ...qData, answers: aJson?.data ?? [] };
        }

        if (!question) {
            set({ isFinished: true, isLoadingQuestion: false });
        } else {
            set({ currentQuestion: question, isLoadingQuestion: false });
            console.log(
                `[MatchStore] Question loaded: ${question.question_text.substring(
                    0,
                    30,
                )}...`,
            );
        }
    },

    advanceRound: async () => {
        const state = get();
        const isSolo = state.roomInfo?.max_player === 1;

        console.log(
            `[MatchStore] advanceRound called - current: ${state.currentOrder}, selectedAnswerId: ${state.selectedAnswerId}`,
        );
        console.log(
            `[MatchStore] Total questions: ${state.totalQuestions}, currentOrder: ${state.currentOrder}`,
        );

        if (
            state.totalQuestions &&
            state.currentOrder >= state.totalQuestions
        ) {
            console.log(`[MatchStore] Game finished!`);
            set({ isFinished: true });
            return;
        }

        // Starbox check: berlaku untuk SEMUA mode.
        // - Solo: advanceRound dipanggil langsung (tidak lewat waitForAllBattlesAndAdvance)
        // - Multiplayer: safety net jika advanceRound dipanggil dari code path tak terduga
        //   (e.g. Realtime handler). waitForAllBattlesAndAdvance juga punya check serupa.
        if (state.currentOrder % STARBOX_INTERVAL === 0) {
            console.log(
                `[MatchStore] Starbox round! (from advanceRound, round ${state.currentOrder})`,
            );
            set({
                nextRoundUrl: `/starbox?roomId=${state.gameRoomId}&code=${
                    state.roomCode
                }&nextRound=${state.currentOrder + 1}`,
            });
            return;
        }

        const nextOrder = state.currentOrder + 1;
        console.log(`[MatchStore] Advancing to round ${nextOrder}`);

        // Check if we're trying to go beyond total rounds
        if (state.totalQuestions && nextOrder > state.totalQuestions) {
            console.error(
                `[MatchStore] ERROR: Trying to advance to round ${nextOrder} but total rounds is ${state.totalQuestions}`,
            );
            set({ isFinished: true });
            return;
        }

        set({
            currentOrder: nextOrder,
            selectedAnswerId: null,
            firstAnswerId: null,
            firstAnswerPlayerId: null,
            timeLeft: SECONDS_PER_ROUND,
        });

        if (isSolo) {
            // ── SOLO MODE: Skip battle room generation, just load question ──
            console.log(
                `[MatchStore] Solo mode - loading question ${nextOrder} directly`,
            );
            await get().loadQuestion(state.gameRoomId, nextOrder);
            return;
        }

        // ── MULTIPLAYER MODE: Start next round and generate battle rooms ──
        try {
            console.log(`[MatchStore] Starting round ${nextOrder}...`);
            const res = await fetch("/api/match/start-round", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    game_room_id: state.gameRoomId,
                    round_number: nextOrder,
                }),
                credentials: "include",
            });

            if (!res.ok) {
                const errorText = await res.text();

                // Handle common lock error gracefully
                if (
                    res.status === 423 ||
                    errorText.includes(
                        "Another request is currently generating battle rooms",
                    )
                ) {
                    console.warn(
                        `[MatchStore] Round ${nextOrder} is already being started by another player. Waiting to sync...`,
                    );
                    // Wait a bit for the primary request to finish generation
                    await new Promise((resolve) => setTimeout(resolve, 3000));
                } else {
                    console.error(
                        `[MatchStore] Failed to start round ${nextOrder}:`,
                        errorText,
                    );

                    // Try to parse error as JSON
                    try {
                        const errorJson = JSON.parse(errorText);
                        console.error(
                            `[MatchStore] Parsed error:`,
                            JSON.stringify(errorJson, null, 2),
                        );

                        // If it's a "question not found" error, finish the game
                        if (errorJson.error?.includes("Question not found")) {
                            console.log(
                                `[MatchStore] Question not found for round ${nextOrder}, finishing game`,
                            );
                            set({ isFinished: true });
                            return;
                        }
                    } catch (e) {
                        console.error(
                            `[MatchStore] Could not parse error as JSON:`,
                            e,
                        );
                    }
                }
            } else {
                const result = await res.json();
                console.log(
                    `[MatchStore] Round ${nextOrder} started with ${
                        result.battleRooms?.length || 0
                    } battle rooms`,
                );
            }
        } catch (error) {
            console.error("[MatchStore] Error starting round:", error);
        }

        // Sync battle room for new round (after generating)
        await get().syncBattleRoomFromDB();

        // Load question for new round
        await get().loadQuestion(state.gameRoomId, nextOrder);
    },

    waitForAllBattlesAndAdvance: async () => {
        const state = get();

        // Prevent multiple concurrent calls
        if (state.isAdvancingRound) {
            console.log(
                `[MatchStore] ⚠️ Already advancing round, skipping duplicate call`,
            );
            return;
        }

        console.log(
            `[MatchStore] waitForAllBattlesAndAdvance called - current round: ${state.currentOrder}`,
        );

        // Check if game is finished
        if (
            state.totalQuestions &&
            state.currentOrder >= state.totalQuestions
        ) {
            console.log(`[MatchStore] Game finished!`);
            set({ isFinished: true });
            return;
        }

        // Check if this is a Starbox round (multiplayer only)
        const isSolo = state.roomInfo?.max_player === 1;
        if (!isSolo && state.currentOrder % STARBOX_INTERVAL === 0) {
            console.log(`[MatchStore] Starbox round!`);
            set({
                nextRoundUrl: `/starbox?roomId=${state.gameRoomId}&code=${
                    state.roomCode
                }&nextRound=${state.currentOrder + 1}`,
            });
            return;
        }

        // Set flag to prevent multiple concurrent calls
        set({ isAdvancingRound: true });

        // Show loading state
        set({ isWaitingForAllBattles: true });

        // Wait for all battles to finish with polling
        let allFinished = false;
        let attempts = 0;
        const maxAttempts = 60; // Max 60 seconds wait

        while (!allFinished && attempts < maxAttempts) {
            attempts++;

            try {
                const res = await fetch(
                    `/api/match/check-round-status?game_room_id=${state.gameRoomId}&round_number=${state.currentOrder}`,
                    {
                        credentials: "include",
                    },
                );

                if (res.ok) {
                    const data = await res.json();
                    allFinished = data.all_finished;

                    console.log(
                        `[MatchStore] Polling round ${state.currentOrder}: all_finished=${allFinished}, attempt=${attempts}`,
                    );

                    // Check if game should end (only 1 player alive)
                    if (data.game_ended) {
                        console.log(
                            `[MatchStore] Game ended! Only 1 player alive or all rounds completed.`,
                        );
                        set({
                            isFinished: true,
                            isWaitingForAllBattles: false,
                            isAdvancingRound: false,
                        });
                        return;
                    }

                    if (allFinished) {
                        break;
                    }
                } else {
                    console.error(
                        `[MatchStore] Polling failed with status: ${res.status}`,
                        await res.text(),
                    );
                }
            } catch (error) {
                console.error(
                    `[MatchStore] Error polling round status (attempt ${attempts}):`,
                    error,
                );
            }

            // Wait 1 second before next poll
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (!allFinished) {
            console.error(
                `[MatchStore] Timeout waiting for all battles to finish after ${maxAttempts} seconds`,
            );
            set({ isWaitingForAllBattles: false, isAdvancingRound: false });
            return;
        }

        console.log(
            `[MatchStore] All battles finished, preparing to advance to round ${
                state.currentOrder + 1
            }`,
        );

        // Wait 2 seconds for players to see results
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Now advance the round (this will generate new battle rooms and start next round)
        await get().advanceRound();

        // Hide loading state and reset flag
        set({ isWaitingForAllBattles: false, isAdvancingRound: false });
    },

    handleSelectAnswer: async (userId, answerId) => {
        const state = get();
        const isSolo = state.roomInfo?.max_player === 1;

        console.log(
            `[MatchStore] handleSelectAnswer called: userId=${userId.substring(
                0,
                8,
            )}, answerId=${answerId.substring(0, 8)}, isSolo=${isSolo}`,
        );

        if (state.selectedAnswerId || state.isSubmitting) return;

        set({ selectedAnswerId: answerId, isSubmitting: true });

        // ── SOLO MODE ──
        if (isSolo) {
            try {
                const res = await fetch("/api/solo/submit-answer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: userId,
                        answer_id: answerId,
                        game_room_id: state.gameRoomId,
                        round_number: state.currentOrder,
                    }),
                    credentials: "include",
                });

                if (res.ok) {
                    const result = await res.json();
                    console.log("[MatchStore] Solo answer result:", result);

                    // Find the correct answer id from current question options
                    const correctOpt = state.currentQuestion?.options.find(
                        (o) => o.isCorrect,
                    );
                    set({
                        lastAnswerCorrect: result.is_correct ?? false,
                        correctAnswerId: correctOpt?.id ?? null,
                        isSubmitting: false,
                    });

                    // Solo mode: show feedback briefly, then advance immediately
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                    get().advanceRound();
                } else {
                    console.error(
                        "[MatchStore] Solo answer submit failed",
                        await res.text(),
                    );
                    set({ isSubmitting: false });
                }
            } catch (e) {
                console.error("[MatchStore] Failed to submit solo answer:", e);
                set({ isSubmitting: false });
            }
            return;
        }

        // ── MULTIPLAYER MODE ──
        if (!state.currentBattleRoom) {
            console.error("[MatchStore] User not in any battle room");
            set({ isSubmitting: false });
            return;
        }

        console.log(
            `[MatchStore] currentBattleRoom: ${state.currentBattleRoom.battle_room_id}`,
        );
        console.log(
            `[MatchStore] first_answer_user_id: ${state.currentBattleRoom.first_answer_user_id}`,
        );

        if (state.currentBattleRoom.first_answer_user_id) {
            console.log(
                "[MatchStore] Someone already answered in this battle room",
            );
            set({ isSubmitting: false });
            return;
        }

        try {
            // Submit answer to battle API
            const res = await fetch("/api/battle/submit-answer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    answer_id: answerId,
                    battle_room_id: state.currentBattleRoom.battle_room_id,
                    game_room_id: state.gameRoomId,
                    round_number: state.currentOrder,
                }),
                credentials: "include",
            });

            console.log(`[MatchStore] Response status: ${res.status}`);

            if (!res.ok) {
                console.error("[MatchStore] Failed to submit answer");
                const errorText = await res.text();
                console.error("[MatchStore] Error response:", errorText);
            } else {
                const result = await res.json();
                console.log("[MatchStore] Answer result:", result);

                // Update state dengan data first answer
                if (result.success) {
                    const correctOpt = state.currentQuestion?.options.find(
                        (o) => o.isCorrect,
                    );
                    set({
                        lastAnswerCorrect: result.is_correct ?? false,
                        correctAnswerId: correctOpt?.id ?? null,
                        firstAnswerPlayerId: state.currentUser?.id || null,
                        firstAnswerId: answerId,
                    });

                    console.log(
                        "[MatchStore] Syncing players after answer submission...",
                    );
                    await get().syncPlayersFromDB(state.gameRoomId);
                }
            }
        } catch (e) {
            console.error("[MatchStore] Failed to submit answer:", e);
        } finally {
            set({ isSubmitting: false });
        }
    },

    decrementTimer: async () => {
        const {
            timeLeft,
            isLoadingQuestion,
            isFinished,
            currentBattleRoom,
            gameRoomId,
            currentOrder,
            isAdvancingRound,
            roomInfo,
        } = get();

        const isSolo = roomInfo?.max_player === 1;

        if (isLoadingQuestion || isFinished) return;

        // Prevent calling waitForAllBattlesAndAdvance multiple times
        if (isAdvancingRound || timeLeft === 0) {
            console.log(
                `[MatchStore] Timer check: already advancing or timer at 0, skipping`,
            );
            return;
        }

        if (timeLeft <= 1) {
            console.log(`[MatchStore] Timer expired for round ${currentOrder}`);

            set({ timeLeft: 0 });

            // ── SOLO MODE: skip battle/polling, advance directly ──
            if (isSolo) {
                console.log(
                    `[MatchStore] Solo mode - advancing round directly`,
                );
                await get().advanceRound();
                return;
            }

            // ── MULTIPLAYER MODE: apply timeout damage then poll ──
            if (currentBattleRoom && !currentBattleRoom.first_answer_user_id) {
                // No one answered - handle timeout damage
                console.log(
                    `[MatchStore] No one answered in battle room, applying timeout damage`,
                );

                try {
                    const res = await fetch("/api/battle/timeout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            game_room_id: gameRoomId,
                            round_number: currentOrder,
                            battle_room_id: currentBattleRoom.battle_room_id,
                        }),
                        credentials: "include",
                    });

                    if (res.ok) {
                        console.log(
                            `[MatchStore] Timeout damage applied successfully`,
                        );

                        // Sync players to get updated health from database (ONLY ONCE)
                        // Real-time subscription will handle subsequent updates
                        console.log(
                            "[MatchStore] Syncing players after timeout damage...",
                        );
                        await get().syncPlayersFromDB(gameRoomId);
                    } else {
                        const errorText = await res.text();
                        // Battle room might have already been processed or deleted if someone else's timeout/answer triggered first
                        if (errorText.includes("Battle room not found")) {
                            console.warn(
                                `[MatchStore] Battle room not found for timeout damage (already processed?):`,
                                errorText,
                            );
                        } else {
                            console.error(
                                `[MatchStore] Failed to apply timeout damage:`,
                                errorText,
                            );
                        }
                    }
                } catch (error) {
                    console.error(
                        `[MatchStore] Error calling timeout API:`,
                        error,
                    );
                }
            }

            console.log(
                `[MatchStore] Timer expired, waiting for all battles to finish...`,
            );
            await get().waitForAllBattlesAndAdvance();

            return;
        }

        set((state) => ({ timeLeft: state.timeLeft - 1 }));
    },

    resetMatch: () => {
        set({
            roomCode: "",
            gameRoomId: "",
            roomInfo: null,
            currentOrder: 1,
            totalQuestions: null,
            currentQuestion: null,
            isLoadingQuestion: true,
            selectedAnswerId: null,
            isSubmitting: false,
            isFinished: false,
            timeLeft: SECONDS_PER_ROUND,
            players: [],
            currentUser: null,
            currentBattleRoom: null,
            opponentIds: [],
            firstAnswerPlayerId: null,
            firstAnswerId: null,
            nextRoundUrl: null,
            error: null,
            isWaitingForAllBattles: false,
            isAdvancingRound: false,
            isSyncingPlayers: false,
            lastAnswerCorrect: null,
            correctAnswerId: null,
            matchStartTime: null,
        });
    },
}));
