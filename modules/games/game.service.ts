import {
    GameRoomWithPlayerCount,
    GameRoom,
    CreateRoomParams,
    GroupedGameRooms,
    EndgameResult,
    BattleRoom,
    PlayerWithHealth,
} from "@/modules/games/game.schema";
import { gameRoomRepository } from "@/modules/games/game.repository";
import { GAME_CONSTANTS } from "@/lib/game/gameConstants";
import { parseDBDate, calculateDuration } from "@/lib/utils/dateUtils";
import { calculateRewards } from "@/lib/game/rewardCalculator";
import { PlayerOpponents } from "@/modules/gamePlayers/gamePlayers.schema";
import { battleRoomService } from "@/modules/battles/battle.service";
import { lockManager } from "@/lib/utils/lockManager";
import { gamePlayersService } from "@/modules/gamePlayers/gamePlayers.service";

// In-memory track opponents untuk setiap game (reset per round)
const playerOpponentsCache: Map<string, PlayerOpponents[]> = new Map();

export const gameRoomService = {
    playerOpponentsCache,

    /**
     * Migrate the host of a game room to a new user.
     */
    async migrateRoomHost(roomId: string, newHostId: string) {
        if (!newHostId) {
            throw new Error("New host ID is required");
        }
        return gameRoomRepository.migrateRoomHost(roomId, newHostId);
    },

    /**
     * Fetch public open rooms and group them by category.
     * Returns an array of { topic, rooms[] } for rendering CategorySections.
     */
    async getGroupedPublicRooms(): Promise<GroupedGameRooms[]> {
        const rooms = await gameRoomRepository.getPublicOpenRooms();

        // Group by category (acts as topic)
        const groupMap = new Map<string, GameRoomWithPlayerCount[]>();

        for (const room of rooms) {
            const topic = room.category;
            if (!groupMap.has(topic)) {
                groupMap.set(topic, []);
            }
            groupMap.get(topic)!.push(room);
        }

        // Convert map to sorted array
        return Array.from(groupMap.entries()).map(([topic, rooms]) => ({
            topic,
            rooms,
        }));
    },

    /**
     * Fetch all public open rooms as a flat list.
     * Digunakan oleh GET /api/game-rooms.
     */
    async getPublicOpenRooms(): Promise<GameRoomWithPlayerCount[]> {
        return await gameRoomRepository.getPublicOpenRooms();
    },

    /**
     * Fetch all game rooms created by a user.
     */
    async getUserRooms(userId: string): Promise<GameRoomWithPlayerCount[]> {
        return await gameRoomRepository.getUserRooms(userId);
    },

    /**
     * Get a specific room by its code.
     */
    async getRoomByCode(
        roomCode: string,
    ): Promise<GameRoomWithPlayerCount | null> {
        return await gameRoomRepository.getRoomByCode(roomCode);
    },

    /**
     * Fetch N random public open rooms (for homepage preview).
     */
    async getRandomPublicRooms(
        limit: number = 4,
    ): Promise<GameRoomWithPlayerCount[]> {
        return await gameRoomRepository.getRandomPublicRooms(limit);
    },

    /**
     * Orchestrates creating a game room, mapping Gemini AI questions, and inserting ability materials.
     * This is called by POST /api/game-rooms
     */
    async createGameRoomFromAI(
        payload: CreateRoomParams & {
            questions: {
                theme_materials?: string;
                ability_materials?: {
                    title: string;
                    text?: string;
                    content?: string;
                }[];
                list_questions?: {
                    question_order: number;
                    question_text: string;
                    options?: {
                        answer_text: string;
                        is_correct: boolean;
                        key?: string;
                    }[];
                    answers?: {
                        answer_text: string;
                        is_correct: boolean;
                        key?: string;
                    }[];
                }[];
            };
        },
    ): Promise<GameRoom | null> {
        const { questions: listQuestions, ...restOfBody } = payload;
        const listAbilities = listQuestions?.ability_materials || [];

        // Fallback category to theme_materials if not provided!
        const finalCategory =
            restOfBody.category || listQuestions?.theme_materials || "General";

        // Generate image URL based on category (Business Logic)
        const ENUM_CATEGORIES = [
            "bahasaindonesia",
            "bahasainggris",
            "biologi",
            "pancasila",
            "pemrograman",
            "sejarah",
        ];
        const formattedCat = String(finalCategory)
            .toLowerCase()
            .replace(/\s+/g, "");
        const imageName = ENUM_CATEGORIES.includes(formattedCat)
            ? `${formattedCat}2.webp`
            : "default2.webp";
        const generatedImageUrl = `https://cmgkgwzhiloxdttftmwf.supabase.co/storage/v1/object/public/room-categories/${imageName}`;

        const createParams: CreateRoomParams = {
            user_id: restOfBody.user_id,
            room_code:
                restOfBody.room_code ||
                Math.random().toString(36).substring(2, 10).toUpperCase(),
            category: finalCategory,
            title: restOfBody.title,
            max_player: Number(restOfBody.max_player) || 20,
            total_round:
                Number(restOfBody.total_round) ||
                listQuestions?.list_questions?.length ||
                10,
            difficulty: restOfBody.difficulty || "mudah",
            // Use explicitly provided image_url, or auto-generate from category
            image_url: restOfBody.image_url || generatedImageUrl,
            room_status: restOfBody.room_status || "open",
            room_visibility: restOfBody.room_visibility || "public",
        };

        console.log("[GameRoomService] Creating game_room:", {
            room_code: createParams.room_code,
            category: createParams.category,
            max_player: createParams.max_player,
        });

        // 1. Create Game Room
        const room = await gameRoomRepository.createRoom(createParams);
        if (!room) {
            console.error("[GameRoomService] createRoom returned null");
            throw new Error("Gagal membuat game room.");
        }

        // 2. Map & Insert Questions
        // Tolerant mapping — supports both AI (question_text) and legacy (question) field names
        const MappedQuestions = (listQuestions?.list_questions || []).map(
            (q: any) => ({
                question_order: q.question_order || q.order || 1,
                question_text: q.question_text || q.question || "",
                answers: (q.options || q.answers || []).map((opt: any) => ({
                    answer_text: opt.answer_text || opt.text || "",
                    is_correct: opt.is_correct || opt.isCorrect || false,
                    key: opt.key || "",
                })),
            }),
        );

        if (MappedQuestions.length > 0) {
            await gameRoomRepository.insertQuestionsWithAnswers(
                room.game_room_id,
                MappedQuestions,
            );
        }

        // 3. Insert Ability Materials
        if (listAbilities.length > 0) {
            await gameRoomRepository.insertAbilityMaterials(
                room.game_room_id,
                listAbilities,
            );
        }

        console.log(
            "[GameRoomService] POST /api/game-rooms SUCCESS:",
            room.game_room_id,
        );

        return room;
    },

    /**
     * Get game room strictly by ID
     */
    async getRoomById(roomId: string) {
        return await gameRoomRepository.getRoomById(roomId);
    },

    /**
     * Fetch basic game room configuration.
     */
    async getGameRoom(roomId: string) {
        return await gameRoomRepository.getGameRoom(roomId);
    },

    /**
     * Update room settings like visibility or status
     */
    async updateRoomSettings(
        roomId: string,
        updates: { room_visibility?: string; room_status?: string },
    ) {
        return await gameRoomRepository.updateGameRoomSettings(roomId, updates);
    },

    /**
     * Duplicate an existing game room along with its questions and abilities.
     */
    async duplicateGameRoom(
        gameRoomId: string,
        params: { max_player: number; is_solo: boolean },
    ) {
        const { max_player, is_solo } = params;

        // 1. Fetch original room
        const originalRoom = await gameRoomRepository.getRoomById(gameRoomId);
        if (!originalRoom) {
            throw new Error("Room tidak ditemukan");
        }

        console.log(
            `[DUPLICATE] Original room found: ${originalRoom.room_code}, category: ${originalRoom.category}`,
        );

        // 2. Fetch original questions
        const { data: questions, error: questionsError } =
            await gameRoomRepository.getQuestionsWithAnswers(gameRoomId);
        if (questionsError || !questions || questions.length === 0) {
            throw new Error("Tidak ada pertanyaan di room ini");
        }

        console.log(`[DUPLICATE] Found ${questions.length} questions`);

        // Log detailed question data for debugging
        questions.forEach((q: any, idx: number) => {
            console.log(`[DUPLICATE] Question ${idx + 1}:`);
            console.log(`  - question_id: ${q.question_id}`);
            console.log(`  - question_order: ${q.question_order}`);
            console.log(
                `  - question_text: ${q.question_text?.substring(0, 50)}...`,
            );
            console.log(`  - Number of answers: ${q.answers?.length || 0}`);

            if (q.answers && q.answers.length > 0) {
                q.answers.forEach((a: any, aIdx: number) => {
                    console.log(`    Answer ${aIdx + 1}:`);
                    console.log(`      - answer_id: ${a.answer_id}`);
                    console.log(
                        `      - answer_text: ${a.answer_text?.substring(
                            0,
                            30,
                        )}...`,
                    );
                    console.log(`      - is_correct: ${a.is_correct}`);
                    console.log(`      - key: ${a.key}`);
                });
            }
        });

        // 3. Generate new room code
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let newRoomCode = "";
        for (let i = 0; i < 8; i++) {
            newRoomCode += chars.charAt(
                Math.floor(Math.random() * chars.length),
            );
        }

        console.log(`[DUPLICATE] New room code: ${newRoomCode}`);

        // 4. Create new room
        const newRoom = await gameRoomRepository.createRoom({
            user_id: originalRoom.user_id,
            room_code: newRoomCode,
            category: originalRoom.category,
            title: originalRoom.title || originalRoom.category,
            max_player: Number(max_player),
            total_round: originalRoom.total_round,
            difficulty: originalRoom.difficulty,
            image_url: originalRoom.image_url,
            room_status: "open",
            room_visibility: is_solo ? "private" : "private",
        });

        if (!newRoom) {
            throw new Error("Gagal membuat room baru");
        }

        console.log(`[DUPLICATE] New room created: ${newRoom.game_room_id}`);

        // 5. Insert duplicated questions
        const result = await gameRoomRepository.insertQuestionsWithAnswers(
            newRoom.game_room_id,
            questions,
        );

        console.log(
            `[DUPLICATE] ✅ Questions copied: ${result.questionsInserted}, Answers copied: ${result.answersInserted}`,
        );

        // 6. Duplicate abilities
        const { data: originalMaterials } =
            await gameRoomRepository.getAbilityMaterials(gameRoomId);

        let materialsCount = 0;
        if (originalMaterials && originalMaterials.length > 0) {
            console.log(
                `[DUPLICATE] Found ${originalMaterials.length} materials. Copying...`,
            );
            materialsCount = await gameRoomRepository.insertAbilityMaterials(
                newRoom.game_room_id,
                originalMaterials,
            );
            console.log(`[DUPLICATE] ✅ Materials copied: ${materialsCount}`);
        } else {
            console.log(`[DUPLICATE] ⚠️ No materials found to copy.`);
        }

        return {
            newRoom,
            newRoomCode,
            questionsInserted: result.questionsInserted,
            answersInserted: result.answersInserted,
            materialsCount,
        };
    },
    /**
     * Get current room_status for a given room.
     * Digunakan oleh API route sebagai pre-flight check sebelum memproses reward.
     */
    async getRoomStatus(roomId: string): Promise<string | null> {
        const room = await gameRoomRepository.getGameRoom(roomId);
        return room?.room_status ?? null;
    },

    /**
     * Calculates match results from raw database data.
     * Business Logic: Ranking, Reward Formulas (Coins, Trophies), Win/Loss counts.
     */
    async calculateMatchResults(roomId: string): Promise<EndgameResult[]> {
        // 1. Parallelize initial fetches
        const [players, gameRoomData] = await Promise.all([
            gameRoomRepository.getGamePlayers(roomId),
            gameRoomRepository.getGameRoom(roomId),
        ]);

        if (!players || players.length === 0) {
            console.error("[EndgameService] No players found for room.");
            return [];
        }

        const totalPlayers = players.length;
        if (totalPlayers === 0) return [];

        const N =
            gameRoomData?.total_round || GAME_CONSTANTS.DEFAULT_TOTAL_ROUNDS;

        const userIds = players.map((p) => p.user_id);

        // 2. Parallelize data enrichment fetches
        const [chars, answersData, earlyRound, battleRooms, abilitiesResults] =
            await Promise.all([
                gameRoomRepository.getUserCharacters(userIds),
                gameRoomRepository.getUserAnswers(roomId),
                gameRoomRepository.getEarliestRoundTime(roomId),
                gameRoomRepository.getBattleRooms(roomId),
                Promise.all(
                    userIds.map((id: string) =>
                        gameRoomRepository.getUserAbilities(roomId, id),
                    ),
                ),
            ]);

        const abilitiesMap = new Map<
            string,
            { ability_id: number; stock: number }[]
        >();
        userIds.forEach((id: string, index: number) => {
            abilitiesMap.set(id, abilitiesResults[index] || []);
        });

        const charMap = new Map();
        if (chars) {
            chars.forEach((c) => {
                const charDetail = Array.isArray(c.characters)
                    ? c.characters[0]
                    : c.characters;
                charMap.set(c.user_id, charDetail);
            });
        }

        // 3. Win/Loss Tracking setup
        const playerWins = new Map<string, number>();
        const playerLosses = new Map<string, number>();
        userIds.forEach((id: string) => {
            playerWins.set(id, 0);
            playerLosses.set(id, 0);
        });

        // Multiplayer calculation relies on battle_rooms records
        if (totalPlayers > 1) {
            console.log(
                `[EndgameService] [${roomId}] Found ${
                    battleRooms?.length || 0
                } battle rooms for wins calculation.`,
            );

            const firstAnswerIds =
                battleRooms?.map((b) => b.first_answer_id).filter(Boolean) ||
                [];

            console.log(
                `[EndgameService] [${roomId}] Found ${firstAnswerIds.length} battle rooms with a recorded first answer.`,
            );

            const correctAnswers =
                firstAnswerIds.length > 0
                    ? await gameRoomRepository.getCorrectAnswers(
                          firstAnswerIds as string[],
                      )
                    : [];

            const correctnessMap = new Map();
            correctAnswers?.forEach((a) =>
                correctnessMap.set(a.answer_id, a.is_correct),
            );

            if (battleRooms && battleRooms.length > 0) {
                battleRooms?.forEach((room) => {
                    const roomPlayers = [
                        room.player1_id,
                        room.player2_id,
                        room.player3_id,
                    ].filter(Boolean) as string[];

                    if (roomPlayers.length <= 1) return;

                    if (!room.first_answer_user_id) {
                        roomPlayers.forEach((p) =>
                            playerLosses.set(p, (playerLosses.get(p) || 0) + 1),
                        );
                    } else {
                        const isCorrect = correctnessMap.get(
                            room.first_answer_id,
                        );
                        const answerer = room.first_answer_user_id;

                        roomPlayers.forEach((p) => {
                            if (isCorrect) {
                                if (p === answerer)
                                    playerWins.set(
                                        p,
                                        (playerWins.get(p) || 0) + 1,
                                    );
                                else
                                    playerLosses.set(
                                        p,
                                        (playerLosses.get(p) || 0) + 1,
                                    );
                            } else {
                                if (p === answerer)
                                    playerLosses.set(
                                        p,
                                        (playerLosses.get(p) || 0) + 1,
                                    );
                                else
                                    playerWins.set(
                                        p,
                                        (playerWins.get(p) || 0) + 1,
                                    );
                            }
                        });
                    }
                });
            }
        }

        // 4. Map and determine individual stats
        const playersStats = players.map((p) => {
            const pAnswers = (answersData || []).filter(
                (a) => a.user_id === p.user_id,
            );

            // Calculate win/loss based on game_players record (round wins) for consistency
            let winCount = p.win || 0;

            // SOLO MODE FALLBACK: If win is 0 and it's a solo game, calculate from correct answers
            if (winCount === 0 && totalPlayers === 1) {
                winCount = pAnswers.filter((a) => a.answers?.is_correct).length;
                console.log(
                    `[EndgameService] Solo player win calculation: ${winCount}/${N}`,
                );
            }

            let loseCount = Math.max(0, N - winCount);

            // Start of match: preference order:
            // 1. created_at of round 1 (most accurate for game board interaction)
            // 2. created_at of the game_room (when lobby was ready)
            // 3. created_at of the game_player record (when player joined or match was initialized)
            // 4. updated_at of the game_room (last fallback)
            const matchStart = parseDBDate(
                earlyRound?.created_at ||
                    gameRoomData?.created_at ||
                    p.created_at ||
                    gameRoomData?.updated_at,
            );

            // End time logic:
            // If player is still alive, survival time is until the room finished
            const isRoomFinished = gameRoomData?.room_status === "finished";
            const matchEnd =
                p.status === "alive"
                    ? isRoomFinished
                        ? parseDBDate(gameRoomData?.updated_at)
                        : Date.now()
                    : parseDBDate(p.updated_at);

            const survivalTime = calculateDuration(matchStart, matchEnd);

            const userObj = Array.isArray(p.users) ? p.users[0] : p.users;
            const cData = charMap.get(p.user_id);

            return {
                userId: p.user_id,
                username: userObj?.username || "Unknown",
                totalTrophy: userObj?.total_trophy || 0,
                characterImage: cData?.image_url || "/default/Slime.webp",
                baseCharacter: cData?.skin_name || "Slime",
                health: p.health || 0,
                status: p.status,
                deathRound:
                    p.status !== "alive"
                        ? pAnswers.length > 0
                            ? Math.max(...pAnswers.map((a) => a.round_number))
                            : 0
                        : 999,
                answerCount: pAnswers.length,
                win: winCount,
                lose: loseCount,
                survivalTime,
            };
        });

        // 5. Determine Placements via Sorting
        playersStats.sort((a, b) => {
            const aAlive = a.status === "alive";
            const bAlive = b.status === "alive";
            if (aAlive && !bAlive) return -1;
            if (!aAlive && bAlive) return 1;
            if (aAlive && bAlive) {
                if (a.health !== b.health) return b.health - a.health;
            } else {
                if (a.deathRound !== b.deathRound)
                    return b.deathRound - a.deathRound;
            }
            return b.answerCount - a.answerCount;
        });

        // 6. Final reward calculation loop
        return playersStats.map((p, index) => {
            const Rank = index + 1;

            // Ability Boosts (Multiplier) from match records
            let coinBoost = 0;
            let trophyBoost = 0;

            const pAbilities = abilitiesMap.get(p.userId) || [];

            // PIALA KEJAYAAN (ID 5) = Trophy Multiplier
            const piala = pAbilities.find(
                (a) => a.ability_id === GAME_CONSTANTS.TROPHY_BUFF_ID,
            );
            if (piala)
                trophyBoost = Math.round(
                    piala.stock * GAME_CONSTANTS.BUFF_PERCENT_PER_STOCK,
                );

            // KANTONG HARTA (ID 6) = Coin Multiplier
            const kantong = pAbilities.find(
                (a) => a.ability_id === GAME_CONSTANTS.COIN_BUFF_ID,
            );
            if (kantong)
                coinBoost = Math.round(
                    kantong.stock * GAME_CONSTANTS.BUFF_PERCENT_PER_STOCK,
                );

            // Use shared calculator for consistenty
            console.log(
                `[EndgameService] Calculating rewards for ${p.username}: Rank=${Rank}, Wins=${p.win}, N=${N}, totalPlayers=${totalPlayers}`,
            );

            const { trophyWon, coinsEarned } = calculateRewards({
                rank: Rank,
                totalPlayers,
                totalRounds: N,
                wins: p.win,
                losses: p.lose,
                coinBoost,
                trophyBoost,
            });

            return {
                userId: p.userId,
                username: p.username,
                characterImage: p.characterImage,
                baseCharacter: p.baseCharacter,
                placement: Rank,
                trophyWon,
                coinsEarned,
                health: p.health,
                isAlive: p.status === "alive",
                deathRound: p.deathRound === 999 ? N : p.deathRound,
                answerTime: p.answerCount,
                survivalTime: p.survivalTime,
                win: p.win,
                lose: p.lose,
                coinBoost,
                trophyBoost,
            };
        });
    },

    /**
     * Centralized IDEMPOTENT endgame processing.
     * Logic: Reward calculations, ability multipliers, database updates for all players.
     *
     * Flow:
     * 1. Atomically transition room_status from "ongoing"/"playing" → "processing" (lock)
     * 2. Calculate and persist ALL rewards to user_games + users tables
     * 3. Set room_status → "finished" only AFTER all rewards are persisted
     *
     * This ensures rewards are ALWAYS written before the room is marked finished,
     * preventing the race condition where concurrent calls see "finished" and skip.
     */
    async processCentralizedRewards(roomId: string): Promise<void> {
        const reqId = Math.random().toString(36).substring(2, 7).toUpperCase();
        console.log(
            `[${reqId}] [EndgameService] Processing rewards for room ${roomId}`,
        );

        try {
            // Step 1: Read current room status
            console.log(
                `[${reqId}] [EndgameService] Step 1: Checking status for room ${roomId}`,
            );
            const room = await gameRoomRepository.getGameRoom(roomId);

            if (!room) {
                console.error(
                    `[EndgameService] Room ${roomId} not found in DB.`,
                );
                return;
            }

            console.log(
                `[${reqId}] [EndgameService] [${roomId}] Current room_status: "${room.room_status}"`,
            );

            // If room is already "finished", rewards have already been persisted — skip.
            if (room.room_status === "finished") {
                console.log(
                    `[${reqId}] [EndgameService] [${roomId}] Room already finished (rewards already persisted). [SKIPPED]`,
                );
                return;
            }

            // Handle stale processing lock (override if > 30s)
            let isStale = false;
            if (room.room_status === "processing") {
                const lastUpdate = new Date(room.updated_at).getTime();
                const now = Date.now();
                if (now - lastUpdate < 30000) {
                    console.log(
                        `[${reqId}] [EndgameService] [${roomId}] Room is being processed by another worker. [SKIPPED]`,
                    );
                    return;
                }
                console.log(
                    `[${reqId}] [EndgameService] [${roomId}] Room processing seems stale (>30s). Will override lock...`,
                );
                isStale = true;
            }

            // Step 2 & 3: Calculate BEFORE Locking
            const maxRank = await gameRoomRepository.getRankInfo(
                GAME_CONSTANTS.MAX_STATS_RANK_ID,
            );
            const MAX_TROPHY_LIMIT =
                maxRank?.max_trophy || GAME_CONSTANTS.DEFAULT_MAX_TROPHY;

            console.log(
                `[${reqId}] [EndgameService] Step 2: Calculating results for room ${roomId} (In-Memory prior to lock)`,
            );
            const results = await this.calculateMatchResults(roomId);

            const firstResult =
                results && results.length > 0 ? results[0] : null;
            console.log(
                `[${reqId}] [EndgameService] Step 3: Results calculated. Count: ${results.length}. First Player: ${firstResult?.username}, Trophy: ${firstResult?.trophyWon}, Coin: ${firstResult?.coinsEarned}`,
            );

            if (results.length === 0) {
                console.warn(
                    `[${reqId}] [EndgameService] No players found for room ${roomId}, nothing to process. Set finish later.`,
                );
                return;
            }

            // Step 4: Atomically CAS room_status → "processing" to acquire the lock.
            // Only the FIRST caller whose CAS succeeds will proceed.
            console.log(
                `[${reqId}] [EndgameService] Step 4: Acquiring lock by marking room ${roomId} "processing" (Current Step 1 state: status="${room.room_status}", updated_at="${room.updated_at}")...`,
            );

            // Either standard lock (from playing) or override (from stale processing)
            const isLocked = isStale
                ? await gameRoomRepository.lockRoomForProcessing(
                      roomId,
                      "processing",
                  )
                : await gameRoomRepository.lockRoomForProcessing(
                      roomId,
                      "playing",
                  );

            if (!isLocked) {
                console.log(
                    `[${reqId}] [EndgameService] [${roomId}] Lock failed. Status changed. [LOSER]`,
                );
                return;
            }

            console.log(
                `[${reqId}] [EndgameService] [${roomId}] [WINNER] Lock acquired (status → "processing"). Proceeding with data persistence...`,
            );

            // Step 5: Persist rewards for each player BEFORE setting room to "finished"
            console.log(
                `[${reqId}] [EndgameService] Step 5: Persisting rewards for ${results.length} players`,
            );
            await Promise.all(
                results.map(async (player) => {
                    try {
                        console.log(
                            `[${reqId}] [EndgameService] [${player.username}] Fetching current global stats for ${player.userId}`,
                        );
                        const userData = await gameRoomRepository.getUserData(
                            player.userId,
                        );
                        if (!userData) {
                            console.error(
                                `[${reqId}] [EndgameService] [${player.username}] Could not fetch user data for ${player.userId}`,
                            );
                            return;
                        }

                        const finalTrophy = player.trophyWon;
                        const finalCoin = player.coinsEarned;
                        const isRank1 = player.placement === 1;

                        console.log(
                            `[${reqId}] [EndgameService] [${player.username}] Persisting: Trophy_Add=${finalTrophy}, Coin_Add=${finalCoin}, Rank=${player.placement}`,
                        );

                        // Update user's match performance in user_games
                        await gameRoomRepository.updateUserGame(
                            player.userId,
                            roomId,
                            {
                                trophy_won: finalTrophy,
                                coins_earned: finalCoin,
                                win: player.win,
                                lose: player.lose,
                            },
                        );
                        console.log(
                            `[${reqId}] [EndgameService] [${player.username}] user_games updated successfully`,
                        );

                        // Update user's global stats
                        let newTrophy =
                            (userData.total_trophy || 0) + finalTrophy;
                        newTrophy = Math.max(
                            0,
                            Math.min(newTrophy, MAX_TROPHY_LIMIT),
                        );

                        // placement_ratio += (placement / max_players)
                        const currentMatchRatio =
                            player.placement / results.length;

                        await gameRoomRepository.updateUserStats(
                            player.userId,
                            {
                                total_trophy: newTrophy,
                                coin: (userData.coin || 0) + finalCoin,
                                total_match: (userData.total_match || 0) + 1,
                                total_rank_1:
                                    (userData.total_rank_1 || 0) +
                                    (isRank1 ? 1 : 0),
                                placement_ratio:
                                    (userData.placement_ratio || 0) +
                                    currentMatchRatio,
                            },
                        );
                        console.log(
                            `[${reqId}] [EndgameService] [${
                                player.username
                            }] Global stats updated: Trophy=${newTrophy}, Coin=${
                                (userData.coin || 0) + finalCoin
                            }, Rank1=${isRank1}`,
                        );
                    } catch (err) {
                        console.error(
                            `[EndgameService] Fatal error processing user ${player.userId}:`,
                            err,
                        );
                    }
                }),
            );

            console.log(
                `[${reqId}] [EndgameService] Step 6: Marking room ${roomId} as "finished" (from "processing") after successful persistence.`,
            );
            const isFinished = await gameRoomRepository.finishRoomProcessing(
                roomId,
            );

            if (!isFinished) {
                console.log(
                    `[${reqId}] [EndgameService] [${roomId}] CRITICAL: Could not finalize room to "finished".`,
                );
            } else {
                console.log(
                    `[${reqId}] [EndgameService] ✅ [SUCCESS] Rewards persisted for room ${roomId}. Room is now: "finished"`,
                );
            }
        } catch (error: unknown) {
            console.error(
                `[EndgameService] FATAL ERROR in processCentralizedRewards for room ${roomId}:`,
                error,
            );

            // Recovery: if we crashed mid-processing, try to revert status back to original 'playing' or 'ongoing' so another caller can retry
            try {
                console.log(
                    `[EndgameService] [${roomId}] Attempting to revert "processing" status to "playing" for recovery...`,
                );
                await gameRoomRepository.revertRoomProcessing(roomId);
            } catch (revertError) {
                console.error(
                    `[EndgameService] [${roomId}] Failed to revert status:`,
                    revertError,
                );
            }

            // Rethrow the error to ensure the Controller is aware of the failure
            // and can return an HTTP 500 status to the client.
            throw error;
        }
    },

    /**
     * Reset opponent cache untuk game tertentu
     */
    resetOpponentCache(gameId: string) {
        this.playerOpponentsCache.set(gameId, []);
        console.log(
            `[BattleRoomService] Reset opponent cache for game ${gameId}`,
        );
    },

    /**
     * Check apakah semua kombinasi lawan sudah terpenuhi
     * Untuk n players, total kombinasi = n * (n-1) / 2
     * Contoh: 4 players = 6 kombinasi, 5 players = 10 kombinasi
     *
     * SPECIAL RULE: Jika hanya tersisa 2-3 players, jangan reset
     * Biarkan mereka terus bertemu (request dari user)
     */
    allOpponentsAssigned(gameId: string, alivePlayerIds: string[]): boolean {
        const cache = this.playerOpponentsCache.get(gameId) || [];

        if (cache.length === 0) return false;

        const alivePlayerCount = alivePlayerIds.length;

        // SPECIAL RULE: Jika hanya 2-3 players, jangan reset
        // Biarkan mereka terus bertemu meskipun semua kombinasi sudah habis
        if (alivePlayerCount <= 3) {
            console.log(
                `[BattleRoomService] ⚠️ Only ${alivePlayerCount} players alive - NO RESET`,
            );
            return false;
        }

        // Hitung total kombinasi yang mungkin: n * (n-1) / 2
        const totalPossibleCombos =
            (alivePlayerIds.length * (alivePlayerIds.length - 1)) / 2;

        // Hitung total lawan yang sudah terassign
        let totalAssigned = 0;
        cache.forEach((player) => {
            totalAssigned += player.opponents.size;
        });

        console.log(`[BattleRoomService] Opponent history check:`);
        console.log(
            `[BattleRoomService]   - Total possible combos: ${totalPossibleCombos}`,
        );
        console.log(`[BattleRoomService]   - Total assigned: ${totalAssigned}`);
        console.log(
            `[BattleRoomService]   - All combos assigned: ${
                totalAssigned >= totalPossibleCombos
            }`,
        );

        return totalAssigned >= totalPossibleCombos;
    },

    /**
     * Reset opponent history ketika semua kombinasi sudah habis
     * Tidak akan dipanggil jika hanya 2-3 players yang hidup
     */
    resetOpponentHistory(gameId: string) {
        console.log(
            `[BattleRoomService] ==================================================`,
        );
        console.log(`[BattleRoomService] ⚠️ ALL COMBINATIONS COMPLETED`);
        console.log(`[BattleRoomService] 🔄 RESETTING opponent history`);
        console.log(
            `[BattleRoomService] Note: Only for 4+ players (2-3 players keep meeting)`,
        );
        console.log(
            `[BattleRoomService] ==================================================`,
        );
        this.resetOpponentCache(gameId);
    },

    /**
     * Get previous opponents untuk player
     */
    getPreviousOpponents(gameId: string, userId: string): Set<string> {
        const cache = this.playerOpponentsCache.get(gameId) || [];
        const playerData = cache.find(
            (p: PlayerOpponents) => p.user_id === userId,
        );
        return playerData?.opponents || new Set();
    },

    /**
     * Add opponent ke history
     */
    addOpponent(gameId: string, userId: string, opponentId: string) {
        let cache = this.playerOpponentsCache.get(gameId) || [];
        let playerData = cache.find(
            (p: PlayerOpponents) => p.user_id === userId,
        );

        if (!playerData) {
            playerData = { user_id: userId, opponents: new Set() };
            cache.push(playerData);
        }

        playerData.opponents.add(opponentId);
        this.playerOpponentsCache.set(gameId, cache);
    },

    /**
     * Round-robin pairing algorithm
     * Setiap round, player tidak akan bertemu lawan yang sama
     * Jika ganjil, 1 room berisi 3 players
     */
    generateRoundRobinPairings(
        playerIds: string[],
        gameId: string,
    ): Array<{
        player1_id: string;
        player2_id: string;
        player3_id?: string;
    }> {
        const totalPlayers = playerIds.length;
        const totalRooms = Math.floor(totalPlayers / 2);
        const isOdd = totalPlayers % 2 !== 0;

        console.log(
            `[BattleRoomService] ==================================================`,
        );
        console.log(
            `[BattleRoomService] Generating pairings for ${totalPlayers} players → ${totalRooms} rooms`,
        );
        console.log(`[BattleRoomService] Is odd: ${isOdd}`);
        console.log(
            `[BattleRoomService] Players:`,
            playerIds.map((id) => id.substring(0, 8)),
        );
        console.log(
            `[BattleRoomService] ==================================================`,
        );

        // Cek apakah semua kombinasi lawan sudah terpenuhi
        if (this.allOpponentsAssigned(gameId, playerIds)) {
            this.resetOpponentHistory(gameId);
        }

        // Shuffle players
        const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
        console.log(
            `[BattleRoomService] Shuffled players:`,
            shuffled.map((id) => id.substring(0, 8)),
        );

        const pairings: Array<{
            player1_id: string;
            player2_id: string;
            player3_id?: string;
        }> = [];

        const usedPlayers = new Set<string>();

        // Helper untuk cek apakah player sudah pernah bertemu
        const hasMet = (playerId: string, opponentId: string): boolean => {
            const prevOpponents = this.getPreviousOpponents(gameId, playerId);
            return prevOpponents.has(opponentId);
        };

        // Helper untuk assign player ke room
        const assignToRoom = (playerId: string, roomId: number): boolean => {
            if (usedPlayers.has(playerId)) {
                console.log(
                    `[BattleRoomService] Player ${playerId.substring(
                        0,
                        8,
                    )} already assigned`,
                );
                return false;
            }

            // Cari lawan yang belum pernah bertemu
            let opponentId: string | null = null;

            for (let i = 0; i < shuffled.length; i++) {
                const potentialOpponentId = shuffled[i];

                // Skip jika:
                // - Sama dengan sendiri
                // - Sudah dipakai
                if (
                    potentialOpponentId === playerId ||
                    usedPlayers.has(potentialOpponentId)
                ) {
                    continue;
                }

                // Jika sudah pernah bertemu, coba cari lawan lain dulu
                if (hasMet(playerId, potentialOpponentId)) {
                    continue;
                }

                // Found perfect opponent (belum pernah bertemu)!
                opponentId = potentialOpponentId;
                break;
            }

            // Fallback: Jika tidak dapat menemukan lawan yang belum pernah bertemu,
            // gunakan lawan manapun yang tersedia
            if (!opponentId) {
                console.log(
                    `[BattleRoomService] ⚠️ No unmet opponent found for ${playerId.substring(
                        0,
                        8,
                    )}, using fallback`,
                );
                for (let i = 0; i < shuffled.length; i++) {
                    const fallbackOpponentId = shuffled[i];
                    if (
                        fallbackOpponentId !== playerId &&
                        !usedPlayers.has(fallbackOpponentId)
                    ) {
                        opponentId = fallbackOpponentId;
                        break;
                    }
                }
            }

            if (!opponentId) {
                console.log(
                    `[BattleRoomService] No opponent found for ${playerId.substring(
                        0,
                        8,
                    )}`,
                );
                return false;
            }

            console.log(
                `[BattleRoomService] Room ${roomId}: ${playerId.substring(
                    0,
                    8,
                )} vs ${opponentId.substring(0, 8)}`,
            );

            pairings.push({
                player1_id: playerId,
                player2_id: opponentId,
                player3_id: undefined,
            });

            // Mark sebagai used
            usedPlayers.add(playerId);
            usedPlayers.add(opponentId);

            // Track opponents
            this.addOpponent(gameId, playerId, opponentId);
            this.addOpponent(gameId, opponentId, playerId);

            return true;
        };

        // Assign players ke rooms
        for (let roomNum = 0; roomNum < totalRooms; roomNum++) {
            // Jika ganjil dan ini room terakhir, beri 3 players
            if (isOdd && roomNum === totalRooms - 1) {
                // Cari 3 players yang belum dipakai
                const availablePlayers = shuffled.filter(
                    (id) => !usedPlayers.has(id),
                );

                if (availablePlayers.length >= 3) {
                    // Ambil 3 pertama
                    const room = {
                        player1_id: availablePlayers[0],
                        player2_id: availablePlayers[1],
                        player3_id: availablePlayers[2],
                    };

                    console.log(
                        `[BattleRoomService] Room ${roomNum + 1} (3 players):`,
                        {
                            p1: room.player1_id.substring(0, 8),
                            p2: room.player2_id.substring(0, 8),
                            p3: room.player3_id.substring(0, 8),
                        },
                    );

                    pairings.push(room);

                    // Track semua kombinasi 3 players
                    for (let i = 0; i < 3; i++) {
                        for (let j = i + 1; j < 3; j++) {
                            this.addOpponent(
                                gameId,
                                availablePlayers[i],
                                availablePlayers[j],
                            );
                            this.addOpponent(
                                gameId,
                                availablePlayers[j],
                                availablePlayers[i],
                            );
                        }
                    }

                    availablePlayers
                        .slice(0, 3)
                        .forEach((id) => usedPlayers.add(id));
                }
            } else {
                // Regular room dengan 2 players
                // Cari player pertama yang belum dipakai
                for (const playerId of shuffled) {
                    if (usedPlayers.has(playerId)) continue;

                    // Coba assign player ini
                    if (assignToRoom(playerId, roomNum + 1)) {
                        break;
                    }
                }
            }
        }

        // Verifikasi: Pastikan semua player ter-assign
        const unassignedPlayers = playerIds.filter(
            (id) => !usedPlayers.has(id),
        );
        if (unassignedPlayers.length > 0) {
            console.error(
                `[BattleRoomService] ERROR: ${unassignedPlayers.length} players not assigned:`,
                unassignedPlayers.map((id) => id.substring(0, 8)),
            );
            throw new Error(`Unassigned players: ${unassignedPlayers.length}`);
        }

        // Verifikasi: Pastikan tidak ada player di multiple rooms
        const playerRoomCount = new Map<string, number>();
        pairings.forEach((room) => {
            playerRoomCount.set(
                room.player1_id,
                (playerRoomCount.get(room.player1_id) || 0) + 1,
            );
            playerRoomCount.set(
                room.player2_id,
                (playerRoomCount.get(room.player2_id) || 0) + 1,
            );
            if (room.player3_id) {
                playerRoomCount.set(
                    room.player3_id,
                    (playerRoomCount.get(room.player3_id) || 0) + 1,
                );
            }
        });

        const duplicatePlayers = Array.from(playerRoomCount.entries())
            .filter(([_, count]) => count > 1)
            .map(([id, count]) => ({ id, count }));

        if (duplicatePlayers.length > 0) {
            console.error(
                `[BattleRoomService] ERROR: Players in multiple rooms:`,
                duplicatePlayers.map((d) => ({
                    id: d.id.substring(0, 8),
                    count: d.count,
                })),
            );
            throw new Error(
                `Players in multiple rooms: ${duplicatePlayers.length}`,
            );
        }

        console.log(
            `[BattleRoomService] ✓ Generated ${pairings.length} battle rooms for ${totalPlayers} players`,
        );

        // Log summary
        const summary = pairings
            .map((room, idx) => {
                const count = room.player3_id ? 3 : 2;
                return `R${idx + 1}:[${room.player1_id.substring(
                    0,
                    6,
                )} vs ${room.player2_id.substring(0, 6)}${
                    room.player3_id
                        ? ` vs ${room.player3_id.substring(0, 6)}`
                        : ""
                }](${count})`;
            })
            .join(", ");
        console.log(`[BattleRoomService] Summary: ${summary}`);
        console.log(
            `[BattleRoomService] ==================================================`,
        );

        return pairings;
    },

    /**
     * Generate battle rooms for a round using round-robin algorithm
     * Only includes alive players (health > 0 and status = 'alive')
     */
    async generateBattleRooms(
        gameId: string,
        roundNumber: number,
        questions: { question_id: string }[],
    ): Promise<BattleRoom[]> {
        console.log(
            `[BattleRoomService] ==================================================`,
        );
        console.log(
            `[BattleRoomService] Generating battle rooms for game ${gameId}, round ${roundNumber}`,
        );
        console.log(
            `[BattleRoomService] ==================================================`,
        );

        // Validate inputs
        if (!questions || questions.length === 0) {
            console.error(
                `[BattleRoomService] ERROR: No questions provided for round ${roundNumber}`,
            );
            throw new Error(`No questions provided for round ${roundNumber}`);
        }

        // 1. Delete existing battle rooms for this round before creating new ones (IDEMPOTENT)
        console.log(
            `[BattleRoomService] Deleting existing battle rooms for round ${roundNumber} (idempotent)`,
        );

        const existingBattleRoomsBeforeDelete =
            await gameRoomRepository.findExistingBattleRooms(
                gameId,
                roundNumber,
            );

        console.log(
            `[BattleRoomService] Found ${
                existingBattleRoomsBeforeDelete?.length || 0
            } existing battle rooms before delete`,
        );

        try {
            await gameRoomRepository.deleteBattleRoomsForRound(
                gameId,
                roundNumber,
            );
            console.log(
                `[BattleRoomService] ✅ Successfully deleted existing battle rooms`,
            );
        } catch (idempotentDeleteError) {
            console.error(
                `[BattleRoomService] Warning deleting existing battle rooms:`,
                idempotentDeleteError,
            );
            // Continue anyway, try to insert
        }

        // 2. Reset opponent cache hanya saat first round (round 1)
        if (roundNumber === 1) {
            this.resetOpponentCache(gameId);
            console.log(
                `[BattleRoomService] Round 1 - Reset opponent cache for fresh start`,
            );
        }

        // 3. Fetch alive players from game_players
        const players = await gameRoomRepository.getPlayers(gameId);

        // 4. Filter only alive players
        const alivePlayers = players.filter(
            (p: PlayerWithHealth) => p.health > 0 && p.status === "alive",
        );

        console.log(
            `[BattleRoomService] Alive players: ${alivePlayers.length} / ${players.length} total`,
        );
        console.log(
            `[BattleRoomService] Alive player IDs:`,
            alivePlayers.map((p: PlayerWithHealth) =>
                p.user_id.substring(0, 8),
            ),
        );

        if (alivePlayers.length < 2) {
            console.log(
                "[BattleRoomService] Not enough alive players for battle rooms",
            );
            return [];
        }

        // 5. Generate round-robin pairings
        const pairings = this.generateRoundRobinPairings(
            alivePlayers.map((p: PlayerWithHealth) => p.user_id),
            gameId,
        );

        // 6. Create battle rooms with assigned questions
        const battleRooms: BattleRoom[] = [];
        let questionIndex = 0;
        let hasDuplicateError = false;

        for (const pairing of pairings) {
            const question = questions[questionIndex % questions.length];

            const battleRoomData = {
                game_room_id: gameId,
                round_number: roundNumber,
                player1_id: pairing.player1_id,
                player2_id: pairing.player2_id,
                player3_id: pairing.player3_id || null,
                question_id: question.question_id,
                status: "waiting" as const,
            };

            console.log(`[BattleRoomService] Inserting room:`, {
                p1: pairing.player1_id.substring(0, 8),
                p2: pairing.player2_id.substring(0, 8),
                p3: pairing.player3_id?.substring(0, 8) || "none",
                question: question.question_id.substring(0, 8),
            });

            const { data: battleRoom, error: insertError } =
                await gameRoomRepository.insertBattleRoom(battleRoomData);

            if (insertError) {
                console.error(
                    `[BattleRoomService] ❌ Error inserting battle room for round ${roundNumber}:`,
                    insertError,
                );
                console.error(
                    "[BattleRoomService] Battle room data:",
                    battleRoomData,
                );

                // Check for duplicate key error (23505 = unique_violation)
                if ((insertError as any).code === "23505") {
                    console.warn(
                        `[BattleRoomService] ⚠️ DUPLICATE KEY ERROR detected - Battle rooms already exist for round ${roundNumber}`,
                    );
                    hasDuplicateError = true;
                    break; // Exit loop, fetch all existing battle rooms
                }

                throw new Error(
                    `Failed to insert battle room: ${
                        (insertError as any).message
                    } (code: ${(insertError as any).code})`,
                );
            }

            if (battleRoom) {
                console.log(
                    `[BattleRoomService] ✅ Successfully inserted battle room ${battleRoom.battle_room_id.substring(
                        0,
                        8,
                    )}`,
                );
                battleRooms.push(battleRoom);
            } else {
                console.warn(
                    `[BattleRoomService] ⚠️ Insert returned no data for room in round ${roundNumber} (possibly created by other client)`,
                );
            }
            questionIndex++;
        }

        // If we encountered a duplicate key error, fetch all existing battle rooms for this round
        if (hasDuplicateError) {
            console.warn(
                `[BattleRoomService] ⚠️ Duplicate key error encountered, fetching all existing battle rooms for round ${roundNumber}...`,
            );
            const allBattleRooms =
                await gameRoomRepository.getAllBattleRoomsForRound(
                    gameId,
                    roundNumber,
                );

            if (allBattleRooms && allBattleRooms.length > 0) {
                console.log(
                    `[BattleRoomService] ✅ Found ${allBattleRooms.length} existing battle rooms in round ${roundNumber}`,
                );
                return allBattleRooms;
            }

            // If we can't find any existing battle rooms, something's wrong
            console.error(
                `[BattleRoomService] ❌ Duplicate key error but couldn't find any existing battle rooms for round ${roundNumber}!`,
            );
            throw new Error(
                `Duplicate key error but couldn't find any existing battle rooms for game ${gameId}, round ${roundNumber}`,
            );
        }

        console.log(
            `[BattleRoomService] Successfully created ${battleRooms.length} battle rooms`,
        );

        // 7. Verifikasi di database
        const verifyData = await gameRoomRepository.getBattleRoomsPlayers(
            gameId,
            roundNumber,
        );

        if (verifyData) {
            console.log(
                `[BattleRoomService] Verification: ${verifyData.length} rooms in DB`,
            );

            const roomPlayers = new Set<string>();
            verifyData.forEach((room: any) => {
                roomPlayers.add(room.player1_id);
                roomPlayers.add(room.player2_id);
                if (room.player3_id) roomPlayers.add(room.player3_id);
            });

            console.log(
                `[BattleRoomService] Unique players in DB: ${roomPlayers.size} (expected: ${alivePlayers.length})`,
            );

            if (roomPlayers.size !== alivePlayers.length) {
                console.error(
                    `[BattleRoomService] ERROR: Player count mismatch!`,
                );
            }
        }

        return battleRooms;
    },

    /**
     * Update battle room status
     */
    async updateBattleRoomStatus(
        battleRoomId: string,
        status: "waiting" | "ongoing" | "finished" | "timeout",
    ): Promise<void> {
        console.log(
            `[BattleRoomService] Updating battle room ${battleRoomId.substring(
                0,
                8,
            )} status to ${status}`,
        );

        const data = await gameRoomRepository.updateBattleRoomStatus(
            battleRoomId,
            status,
        );

        if (!data) {
            console.warn(
                `[BattleRoomService] WARNING: Battle room ${battleRoomId} not found when trying to update to ${status}`,
            );
            return;
        }

        console.log(
            `[BattleRoomService] Battle room ${battleRoomId.substring(
                0,
                8,
            )} updated to ${status}`,
        );
        console.log(`[BattleRoomService] Updated battle room data:`, {
            id: data.battle_room_id.substring(0, 8),
            status: data.status,
        });
    },

    /**
     * End the game:
     * 1. Update room status to 'finished'
     * 2. Calculate and save final results based on survival order
     * 3. Broadcast game end to all clients
     * 4. Delete game_players data
     *
     * Placement logic:
     * - First eliminated = last place (e.g., 4th)
     * - Last survivor = 1st place (winner)
     */
    async endGame(gameId: string): Promise<void> {
        console.log(
            `[RoundService] ==================================================`,
        );
        console.log(`[RoundService] Ending game ${gameId}`);
        console.log(
            `[RoundService] ==================================================`,
        );

        // 1. Centralized Atomic Endgame Processing
        // This will calculate final trophies, coins, Win/Loss, apply abilities,
        // persist everything to user_games and users, and finally set room_status to "finished".
        await this.processCentralizedRewards(gameId);

        // 2. Get final standings
        // Sort by eliminated_at ASC NULLS LAST:
        // - Players who died first (earliest eliminated_at) come first
        // - Players still alive (NULL eliminated_at) come last
        const players = await gameRoomRepository.getPlayersByEliminationOrder(
            gameId,
        );

        const totalPlayers = players?.length || 0;
        console.log(
            `[RoundService] Found ${totalPlayers} players in game_players`,
        );

        // 3. Broadcast game end to all clients via realtime
        await gameRoomRepository.broadcastGameEnded(gameId, players || []);

        // NOTE: game_players is deliberately NOT deleted here so the endgame stats page can fetch players.

        console.log(
            `[RoundService] ==================================================`,
        );
        console.log(`[RoundService] Game ${gameId} ended successfully`);
        console.log(
            `[RoundService] ==================================================`,
        );
    },

    /**
     * Prepare next round:
     * Create match_rounds record for next round
     */
    async prepareNextRound(
        gameId: string,
        currentRoundNumber: number,
    ): Promise<void> {
        const nextRoundNumber = currentRoundNumber + 1;

        // Create match_rounds record for next round (idempotent)
        await gameRoomRepository.upsertNextRound(gameId, nextRoundNumber);

        console.log(
            `[RoundService] Prepared next round ${nextRoundNumber} for game ${gameId}`,
        );
    },

    /**
     * Check if game should end:
     * 1. Only 1 player alive
     * 2. All rounds completed
     */
    async checkGameEndCondition(gameId: string): Promise<boolean> {
        // 1. Check alive players
        const alivePlayers = await gameRoomRepository.getAlivePlayers(gameId);

        console.log(
            `[RoundService] Checking game end condition - alive players: ${alivePlayers.length}`,
        );

        if (alivePlayers.length <= 1) {
            console.log(
                `[RoundService] Game should end - only ${alivePlayers.length} players alive`,
            );
            return true;
        }

        // 2. Check if all rounds completed
        const room = await gameRoomRepository.getGameRoom(gameId);

        if (!room) {
            console.error(
                `[RoundService] Game room not found for game_id: ${gameId}`,
            );
            return false;
        }

        const lastRound = await gameRoomRepository.getLatestMatchRound(gameId);

        if (lastRound && lastRound.round_number >= room.total_round) {
            console.log(
                `[RoundService] Game should end - all ${room.total_round} rounds completed (current: ${lastRound.round_number}/${room.total_round})`,
            );
            return true;
        }

        console.log(
            `[RoundService] Game should NOT end - continuing to round ${
                lastRound ? lastRound.round_number + 1 : 2
            }`,
        );

        return false;
    },

    /**
     * Start a new round:
     * 1. Generate battle rooms (cleanup old ones first)
     * 2. Assign questions to each battle room
     * 3. Update match_rounds status
     */
    async startRound(
        gameId: string,
        roundNumber: number,
        questions: { question_id: string }[],
    ): Promise<BattleRoom[]> {
        console.log(
            `[RoundService] ==================================================`,
        );
        console.log(
            `[RoundService] Starting round ${roundNumber} for game ${gameId}`,
        );
        console.log(
            `[RoundService] ==================================================`,
        );

        // 1. Generate battle rooms (ini sudah menghapus old ones di dalam)
        const battleRooms = await this.generateBattleRooms(
            gameId,
            roundNumber,
            questions,
        );

        if (battleRooms.length === 0) {
            console.log(
                `[RoundService] No battle rooms generated - checking if game should end`,
            );
            // Check if game should end
            const shouldEnd = await this.checkGameEndCondition(gameId);
            if (shouldEnd) {
                await this.endGame(gameId);
            }
            return [];
        }

        // 2. Update battle room status to 'ongoing'
        console.log(
            `[RoundService] Updating ${battleRooms.length} battle rooms to 'ongoing'`,
        );
        for (const battleRoom of battleRooms) {
            await this.updateBattleRoomStatus(
                battleRoom.battle_room_id,
                "ongoing",
            );
        }

        // 3. Create/update match_rounds status (idempotent upsert)
        console.log(`[RoundService] Updating match_rounds status`);
        await gameRoomRepository.activateMatchRound(gameId, roundNumber);
        console.log(
            `[RoundService] match_rounds activated for round ${roundNumber}`,
        );

        console.log(
            `[RoundService] ==================================================`,
        );
        console.log(
            `[RoundService] Round ${roundNumber} started with ${battleRooms.length} battle rooms`,
        );
        console.log(
            `[RoundService] ==================================================`,
        );

        return battleRooms;
    },

    /**
     * Mulai sebuah match:
     * 1. Ambil user_ids dari user_games
     * 2. Insert ke game_players (idempotent)
     * 3. Fetch questions
     * 4. Generate battle rooms untuk round 1
     * 5. Update room_status ke 'playing'
     * 6. Return battle room untuk host (userIds[0])
     */
    async startMatch(gameRoomId: string): Promise<{
        total_players: number;
        first_battle_room: BattleRoom | null;
    }> {
        console.log("=".repeat(60));
        console.log(
            `[GameRoomService] startMatch START for room ${gameRoomId}`,
        );
        console.log("=".repeat(60));

        // Step 1: Ambil semua pemain yang sudah join room
        console.log(
            "[GameRoomService] Step 1: Fetching participants from user_games",
        );
        const userIds = await gameRoomRepository.getUserIdsInRoom(gameRoomId);

        if (userIds.length === 0) {
            throw new Error("Tidak ada pemain yang join room");
        }

        console.log(
            `[GameRoomService] Found ${userIds.length} participants:`,
            userIds,
        );

        // Step 2: Insert ke game_players (via gamePlayers service)
        console.log(
            "[GameRoomService] Step 2: Inserting players to game_players",
        );
        await gamePlayersService.insertPlayers(gameRoomId, userIds);
        console.log("[GameRoomService] Step 2: Done inserting players");

        // Step 3: Fetch questions
        console.log("[GameRoomService] Step 3: Fetching questions");
        const questions = await gameRoomRepository.getQuestionsForRoom(
            gameRoomId,
        );

        if (questions.length === 0) {
            throw new Error("Tidak ada pertanyaan untuk game ini");
        }

        console.log(
            `[GameRoomService] Step 3: Found ${questions.length} questions`,
        );

        // Step 4: Generate battle rooms untuk round 1 (via this.startRound)
        console.log(
            "[GameRoomService] Step 4: Generating battle rooms for round 1",
        );
        const firstQuestion =
            questions.find((q: any) => q.question_order === 1) || questions[0];
        await this.startRound(gameRoomId, 1, [firstQuestion]);
        console.log("[GameRoomService] Step 4: Done generating battle rooms");

        // Step 5: Update room_status ke 'playing'
        console.log(
            "[GameRoomService] Step 5: Updating room status to 'playing'",
        );
        await gameRoomRepository.updateRoomStatus(gameRoomId, "playing");
        console.log("[GameRoomService] Step 5: Done updating room status");

        // Step 6: Get battle room untuk host (userIds[0])
        console.log("[GameRoomService] Step 6: Getting battle room for host");
        const firstBattleRoom = await battleRoomService.getBattleRoomForPlayer(
            gameRoomId,
            userIds[0],
            1,
        );

        console.log("[GameRoomService] First battle room:", firstBattleRoom);
        console.log("[GameRoomService] startMatch SUCCESS");
        console.log("=".repeat(60));

        return {
            total_players: userIds.length,
            first_battle_room: firstBattleRoom,
        };
    },

    /**
     * Memulai ronde baru untuk suatu game room dengan idempotency and lock.
     */
    async startRoundForMatch(
        gameRoomId: string,
        roundNumber: number,
        requestId: string,
    ): Promise<{
        reason?: "ALREADY_EXISTS" | "LOCK_FAILED" | "NOT_FOUND";
        battleRooms?: BattleRoom[];
        message?: string;
        fromLockWait?: boolean;
        debug?: any;
    }> {
        console.log(
            `[GameRoomService][${requestId}] startRoundForMatch START - game: ${gameRoomId}, round: ${roundNumber}`,
        );

        const lockKey = `${gameRoomId}_${roundNumber}`;

        // 1. Idempotency Check - see if rooms already exist
        const existingRooms = await battleRoomService.getAllBattleRoomsForRound(
            gameRoomId,
            roundNumber,
        );

        if (existingRooms && existingRooms.length > 0) {
            console.log(
                `[GameRoomService][${requestId}] ✅ Found ${existingRooms.length} existing battle rooms, returning them directly`,
            );
            return {
                reason: "ALREADY_EXISTS",
                battleRooms: existingRooms,
                message: `Round ${roundNumber} already started (returned existing battle rooms)`,
            };
        }

        // 2. Try to acquire lock
        const lockResult = lockManager.tryAcquireLock(lockKey, requestId);

        if (!lockResult.acquired) {
            console.log(
                `[GameRoomService][${requestId}] ⚠️ Lock not acquired, waiting 2.5s for primary worker...`,
            );

            // Wait to give primary worker time to finish
            await new Promise((resolve) => setTimeout(resolve, 2500));

            // Retry existence check
            const roomsAfterWait =
                await battleRoomService.getAllBattleRoomsForRound(
                    gameRoomId,
                    roundNumber,
                );

            if (roomsAfterWait && roomsAfterWait.length > 0) {
                return {
                    reason: "ALREADY_EXISTS",
                    battleRooms: roomsAfterWait,
                    message: `Round ${roundNumber} already started (returned after wait)`,
                    fromLockWait: true,
                };
            }

            // Retry lock acquisition
            console.log(
                `[GameRoomService][${requestId}] ⚠️ Retry lock acquisition...`,
            );
            const retryResult = lockManager.tryAcquireLock(lockKey, requestId);

            if (!retryResult.acquired) {
                console.log(
                    `[GameRoomService][${requestId}] ❌ Still cannot acquire lock after retries, giving up`,
                );
                return {
                    reason: "LOCK_FAILED",
                    message:
                        "Another request is currently generating battle rooms. Please wait a moment and refresh.",
                };
            }
        }

        try {
            console.log(
                `[GameRoomService][${requestId}] Starting round ${roundNumber} for game ${gameRoomId.substring(
                    0,
                    8,
                )}`,
            );

            // 3. Get questions
            const questions = await gameRoomRepository.getQuestionsForRoom(
                gameRoomId,
            );

            if (!questions || questions.length === 0) {
                return {
                    reason: "NOT_FOUND",
                    message: "No questions found for this game",
                };
            }

            console.log(
                `[GameRoomService][${requestId}] Found ${
                    questions.length
                } questions for game ${gameRoomId.substring(0, 8)}`,
            );

            // Find current question based on order
            const currentQuestion =
                questions.find((q: any) => q.question_order === roundNumber) ||
                questions[roundNumber - 1];

            console.log(
                `[GameRoomService][${requestId}] Questions available:`,
                questions.map((q: any) => q.question_order),
            );
            console.log(
                `[GameRoomService][${requestId}] Looking for question_order === ${roundNumber}`,
            );
            console.log(
                `[GameRoomService][${requestId}] Found question:`,
                currentQuestion,
            );

            if (!currentQuestion) {
                console.error(
                    `[GameRoomService][${requestId}] Question not found for round ${roundNumber}. Questions available:`,
                    questions.map((q: any) => ({
                        order: q.question_order,
                        id: q.question_id,
                    })),
                );

                return {
                    reason: "NOT_FOUND",
                    message: `Question not found for round ${roundNumber}`,
                    debug: {
                        availableRounds: questions.map(
                            (q: any) => q.question_order,
                        ),
                        requestedRound: roundNumber,
                        totalQuestionsAvailable: questions.length,
                    },
                };
            }

            console.log(
                `[GameRoomService][${requestId}] Found question for round ${roundNumber}:`,
                currentQuestion.question_id,
            );

            console.log(
                `[GameRoomService][${requestId}] About to call startRound for round ${roundNumber} with question ${currentQuestion.question_id.substring(
                    0,
                    8,
                )}`,
            );

            // 4. Generate Battle Rooms
            const battleRooms = await this.startRound(gameRoomId, roundNumber, [
                currentQuestion,
            ]);

            if (!battleRooms || battleRooms.length === 0) {
                console.log(
                    `[GameRoomService][${requestId}] No battle rooms generated - game may be ending`,
                );
            } else {
                console.log(
                    `[GameRoomService][${requestId}] Round ${roundNumber} started with ${battleRooms.length} battle rooms`,
                );
            }

            return {
                battleRooms,
                message: `Round ${roundNumber} started successfully`,
            };
        } finally {
            // 5. Always release lock
            lockManager.releaseLock(lockKey, requestId);
        }
    },
};
