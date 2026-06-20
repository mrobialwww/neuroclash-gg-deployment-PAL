import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { getWIBNow } from "@/lib/utils/dateUtils";
import {
    GameRoom,
    GameRoomWithPlayerCount,
    CreateRoomParams,
    GamePlayerWithUser,
    UserCharacterSkin,
    UserAnswerCorrectness,
    BattleRoomData,
    CorrectAnswerInfo,
    EndgameRoomConfig,
    RankMaxTrophy,
    UserAbilityStock,
    UserStatsInfo,
    EarliestRoundTime,
    UserGameRecord,
    PlayerWithHealth,
    BattleRoom,
} from "@/modules/games/game.schema";

export const gameRoomRepository = {
    /**
     * Fetch all public & open game rooms with their player count.
     * Digunakan oleh Server Components — query Supabase langsung (tanpa HTTP round-trip).
     */
    async getPublicOpenRooms(): Promise<GameRoomWithPlayerCount[]> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("game_rooms")
            .select("*")
            .eq("room_status", "open")
            .eq("room_visibility", "public")
            .order("created_at", { ascending: false });

        if (error) {
            console.error(
                "[GameRoomRepo] Error fetching rooms:",
                error.message,
            );
            return [];
        }

        const rooms = data ?? [];
        if (rooms.length === 0) return [];

        // Fetch user_games for these rooms
        const roomIds = rooms.map((r) => r.game_room_id);
        const { data: userGames } = await supabase
            .from("user_games")
            .select("game_room_id, user_id")
            .in("game_room_id", roomIds);

        const countMap = new Map<string, number>();
        const roomAvatarMap = new Map<
            string,
            { image: string; character: string }[]
        >();

        if (userGames && userGames.length > 0) {
            // Collect unique user IDs
            const userIds = Array.from(
                new Set(userGames.map((ug) => ug.user_id)),
            );

            // Fetch active characters for these users
            const { data: userChars } = await supabase
                .from("user_characters")
                .select("user_id, characters!inner(image_url, base_character)")
                .in("user_id", userIds)
                .eq("is_used", true);

            // Map userId -> avatar object
            const avatarMap = new Map<
                string,
                { image: string; character: string }
            >();
            userChars?.forEach(
                (uc: {
                    user_id: string;
                    characters:
                        | { image_url: string; base_character: string }
                        | { image_url: string; base_character: string }[];
                }) => {
                    const charData = Array.isArray(uc.characters)
                        ? uc.characters[0]
                        : uc.characters;
                    if (charData?.image_url) {
                        avatarMap.set(uc.user_id, {
                            image: charData.image_url,
                            character: charData.base_character || "",
                        });
                    }
                },
            );

            // Populate counts and avatars per room
            userGames.forEach((ug) => {
                countMap.set(
                    ug.game_room_id,
                    (countMap.get(ug.game_room_id) || 0) + 1,
                );

                if (!roomAvatarMap.has(ug.game_room_id)) {
                    roomAvatarMap.set(ug.game_room_id, []);
                }

                const avatars = roomAvatarMap.get(ug.game_room_id)!;
                if (avatars.length < 4) {
                    const avatarData = avatarMap.get(ug.user_id);
                    if (avatarData) {
                        avatars.push(avatarData);
                    }
                }
            });
        }

        return rooms.map((room) => ({
            ...room,
            player_count: countMap.get(room.game_room_id) || 0,
            participants_avatars: roomAvatarMap.get(room.game_room_id) || [],
        }));
    },

    /**
     * Fetch all game rooms created by a specific user.
     */
    async getUserRooms(userId: string): Promise<GameRoomWithPlayerCount[]> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("game_rooms")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error(
                "[GameRoomRepo] Error fetching user rooms:",
                error.message,
            );
            return [];
        }

        const rooms = data ?? [];
        if (rooms.length === 0) return [];

        // Fetch user_games for these rooms
        const roomIds = rooms.map((r: GameRoom) => r.game_room_id);
        const { data: userGames } = await supabase
            .from("user_games")
            .select("game_room_id, user_id")
            .in("game_room_id", roomIds);

        const countMap = new Map<string, number>();
        const roomAvatarMap = new Map<
            string,
            { image: string; character: string }[]
        >();

        if (userGames && userGames.length > 0) {
            // Collect unique user IDs
            const userIds = Array.from(
                new Set(userGames.map((ug: { user_id: string }) => ug.user_id)),
            );

            // Fetch active characters for these users
            const { data: userChars } = await supabase
                .from("user_characters")
                .select("user_id, characters!inner(image_url, base_character)")
                .in("user_id", userIds)
                .eq("is_used", true);

            // Map userId -> avatar object
            const avatarMap = new Map<
                string,
                { image: string; character: string }
            >();
            userChars?.forEach(
                (uc: {
                    user_id: string;
                    characters:
                        | { image_url: string; base_character: string }
                        | { image_url: string; base_character: string }[];
                }) => {
                    const charData = Array.isArray(uc.characters)
                        ? uc.characters[0]
                        : uc.characters;
                    if (charData?.image_url) {
                        avatarMap.set(uc.user_id, {
                            image: charData.image_url,
                            character: charData.base_character || "",
                        });
                    }
                },
            );

            // Populate counts and avatars per room
            userGames.forEach(
                (ug: { game_room_id: string; user_id: string }) => {
                    countMap.set(
                        ug.game_room_id,
                        (countMap.get(ug.game_room_id) || 0) + 1,
                    );

                    if (!roomAvatarMap.has(ug.game_room_id)) {
                        roomAvatarMap.set(ug.game_room_id, []);
                    }

                    const avatars = roomAvatarMap.get(ug.game_room_id)!;
                    if (avatars.length < 4) {
                        const avatarData = avatarMap.get(ug.user_id);
                        if (avatarData) {
                            avatars.push(avatarData);
                        }
                    }
                },
            );
        }

        return rooms.map((room: GameRoom) => ({
            ...room,
            player_count: countMap.get(room.game_room_id) || 0,
            participants_avatars: roomAvatarMap.get(room.game_room_id) || [],
        }));
    },

    /**
     * Fetch a single game room by its code.
     * Digunakan oleh Server Components — query Supabase langsung.
     * Client Components menggunakan GET /api/game-rooms/code/[room_code] secara langsung.
     */
    async getRoomByCode(
        roomCode: string,
    ): Promise<GameRoomWithPlayerCount | null> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("game_rooms")
            .select("*")
            .eq("room_code", roomCode);

        if (error) {
            console.error(
                "[GameRoomRepo] Error fetching room by code:",
                error.message,
            );
            return null;
        }

        const rooms = data ?? [];
        if (!rooms.length) return null;

        return { ...rooms[0], player_count: 0 };
    },

    /**
     * Fetch a single game room by ID.
     * Digunakan untuk duplicate feature.
     */
    async getRoomById(gameRoomId: string): Promise<GameRoom | null> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("game_rooms")
            .select("*")
            .eq("game_room_id", gameRoomId)
            .single();

        if (error) {
            console.error(
                "[GameRoomRepo] Error fetching room by ID:",
                error.message,
            );
            return null;
        }

        return data ?? null;
    },

    /**
     * Fetch N random public open rooms.
     * Ambil semua lalu shuffle in-memory.
     */
    async getRandomPublicRooms(
        limit: number = 4,
    ): Promise<GameRoomWithPlayerCount[]> {
        const rooms = await gameRoomRepository.getPublicOpenRooms();

        // Fisher-Yates shuffle
        const shuffled = [...rooms].sort(() => Math.random() - 0.5);

        return shuffled.slice(0, limit);
    },

    /**
     * Update room status
     */
    async updateRoomStatus(
        roomId: string,
        status: "open" | "playing" | "finished",
    ): Promise<void> {
        const supabase = await createClient();

        const { error } = await supabase
            .from("game_rooms")
            .update({ room_status: status })
            .eq("game_room_id", roomId);

        if (error) {
            console.error("[GameRoomRepo] updateRoomStatus error:", error);
            throw new Error(error.message);
        }
    },

    /**
     * Ambil semua user_id yang sudah join suatu room (dari user_games)
     */
    async getUserIdsInRoom(roomId: string): Promise<string[]> {
        console.log(
            `[GameRoomRepo] getUserIdsInRoom called for roomId: ${roomId}`,
        );

        const supabase = await createClient();

        const { data, error } = await supabase
            .from("user_games")
            .select("user_id")
            .eq("game_room_id", roomId);

        if (error) {
            console.error("[GameRoomRepo] getUserIdsInRoom error:", error);
            throw new Error(error.message);
        }

        const userIds = (data ?? []).map((p) => p.user_id);
        console.log(
            `[GameRoomRepo] Found ${userIds.length} participants in room`,
        );
        return userIds;
    },

    /**
     * Ambil semua questions milik suatu room, diurutkan berdasarkan question_order
     */
    async getQuestionsForRoom(
        roomId: string,
    ): Promise<{ question_id: string; question_order: number }[]> {
        console.log(
            `[GameRoomRepo] getQuestionsForRoom called for roomId: ${roomId}`,
        );

        const supabase = await createClient();

        const { data, error } = await supabase
            .from("questions")
            .select("question_id, question_order")
            .eq("game_room_id", roomId)
            .order("question_order", { ascending: true });

        if (error) {
            console.error("[GameRoomRepo] getQuestionsForRoom error:", error);
            throw new Error(error.message);
        }

        const questions = data ?? [];
        console.log(
            `[GameRoomRepo] Found ${questions.length} questions for room`,
        );
        return questions;
    },

    /**
     * Update general room settings (visibility, status)
     */
    async updateGameRoomSettings(
        roomId: string,
        updates: { room_visibility?: string; room_status?: string },
    ) {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("game_rooms")
            .update(updates)
            .eq("game_room_id", roomId)
            .select()
            .single();

        if (error) {
            console.error(
                "[GameRoomRepo] updateGameRoomSettings error:",
                error,
            );
            throw new Error(error.message);
        }

        return data;
    },

    /**
     * Migrate the host of a game room (requires admin privileges to bypass RLS).
     */
    async migrateRoomHost(roomId: string, newHostId: string) {
        const supabaseAdmin = createAdminClient();

        const { data, error } = await supabaseAdmin
            .from("game_rooms")
            .update({ user_id: newHostId })
            .eq("game_room_id", roomId)
            .select();

        if (error) {
            console.error("[GameRoomRepo] migrateRoomHost error:", error);
            throw new Error(error.message);
        }

        return data;
    },

    /**
     * Create a new game room.
     * Digunakan untuk duplicate feature dan create room biasa.
     */
    async createRoom(params: CreateRoomParams): Promise<GameRoom | null> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("game_rooms")
            .insert({
                user_id: params.user_id,
                room_code: params.room_code,
                category: params.category,
                title: params.title,
                max_player: params.max_player,
                total_round: params.total_round,
                difficulty: params.difficulty,
                image_url: params.image_url,
                room_status: params.room_status,
                room_visibility: params.room_visibility,
            })
            .select()
            .single();

        if (error) {
            console.error(
                "[GameRoomRepo] createRoom error:",
                JSON.stringify(error, null, 2),
            );
            console.error(
                "[GameRoomRepo] Params that caused error:",
                JSON.stringify(params, null, 2),
            );
            return null;
        }

        console.log("[GameRoomRepo] ✅ Room created successfully:", data);
        return data ?? null;
    },

    /**
     * Insert questions + answers untuk room baru.
     * Digunakan untuk duplicate feature.
     */
    async insertQuestionsWithAnswers(
        gameRoomId: string,
        questions: {
            question_order: number;
            question_text: string;
            answers?: {
                answer_text: string;
                is_correct: boolean;
                key?: string;
            }[];
        }[],
    ): Promise<{ questionsInserted: number; answersInserted: number }> {
        const supabase = await createClient();

        console.log(`[GameRoomRepo] insertQuestionsWithAnswers START`);
        console.log(`[GameRoomRepo] Target game_room_id: ${gameRoomId}`);
        console.log(
            `[GameRoomRepo] Number of questions to insert: ${questions.length}`,
        );

        let questionsInserted = 0;
        let answersInserted = 0;

        for (const question of questions) {
            console.log(
                `[GameRoomRepo] Processing question ${question.question_order}`,
            );
            console.log(
                `[GameRoomRepo] Question text: ${question.question_text?.substring(
                    0,
                    50,
                )}...`,
            );
            console.log(
                `[GameRoomRepo] Number of answers: ${
                    question.answers?.length || 0
                }`,
            );

            // Insert question
            const { data: newQ, error: qError } = await supabase
                .from("questions")
                .insert({
                    game_room_id: gameRoomId,
                    question_order: question.question_order,
                    question_text: question.question_text,
                })
                .select()
                .single();

            if (qError) {
                console.error(
                    "[GameRoomRepo] ❌ Failed to insert question:",
                    qError,
                );
                console.error("[GameRoomRepo] Error code:", qError.code);
                console.error("[GameRoomRepo] Error message:", qError.message);
                console.error("[GameRoomRepo] Question data:", question);
                continue;
            }

            if (!newQ) {
                console.error(
                    "[GameRoomRepo] ❌ Question insertion returned null:",
                    question.question_order,
                );
                continue;
            }

            console.log(
                `[GameRoomRepo] ✅ Question inserted: ${newQ.question_id}`,
            );
            questionsInserted++;

            // Insert answers untuk question ini
            if (question.answers && question.answers.length > 0) {
                console.log(
                    `[GameRoomRepo] Inserting ${question.answers.length} answers for question ${question.question_order}`,
                );

                for (const answer of question.answers) {
                    console.log(
                        `[GameRoomRepo] Inserting answer: ${answer.answer_text?.substring(
                            0,
                            30,
                        )}...`,
                    );

                    const { data: answerData, error: aError } = await supabase
                        .from("answers")
                        .insert({
                            question_id: newQ.question_id,
                            answer_text: answer.answer_text,
                            is_correct: answer.is_correct === true,
                            key: answer.key,
                        })
                        .select()
                        .single();

                    if (aError) {
                        console.error(
                            "[GameRoomRepo] ❌ Failed to insert answer:",
                            aError,
                        );
                        console.error(
                            "[GameRoomRepo] Error code:",
                            aError.code,
                        );
                        console.error(
                            "[GameRoomRepo] Error message:",
                            aError.message,
                        );
                        console.error("[GameRoomRepo] Answer data:", answer);
                        continue;
                    }

                    if (answerData) {
                        console.log(
                            `[GameRoomRepo] ✅ Answer inserted: ${answerData.answer_id}`,
                        );
                        answersInserted++;
                    } else {
                        console.error(
                            "[GameRoomRepo] ❌ Answer insertion returned null:",
                            answer,
                        );
                    }
                }
            } else {
                console.warn(
                    `[GameRoomRepo] ⚠️ No answers found for question ${question.question_order}`,
                );
            }
        }

        console.log(`[GameRoomRepo] insertQuestionsWithAnswers COMPLETE`);
        console.log(`[GameRoomRepo] Questions inserted: ${questionsInserted}`);
        console.log(`[GameRoomRepo] Answers inserted: ${answersInserted}`);

        return {
            questionsInserted: questionsInserted,
            answersInserted: answersInserted,
        };
    },

    /**
     * Insert ability materials untuk room baru.
     */
    async insertAbilityMaterials(
        gameRoomId: string,
        materials: { title: string; text?: string; content?: string }[],
    ): Promise<number> {
        const supabase = await createClient();
        let insertedCount = 0;

        for (const ability of materials) {
            const { data } = await supabase
                .from("ability_materials")
                .insert({
                    game_room_id: gameRoomId,
                    title: ability.title,
                    content: ability.text ?? ability.content,
                })
                .select()
                .single();

            if (data) insertedCount++;
        }

        return insertedCount;
    },

    /**
     * Fetch questions along with their answers for a game room.
     */
    async getQuestionsWithAnswers(gameRoomId: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("questions")
            .select(
                `
                    question_id,
                    question_order,
                    question_text,
                    answers (
                        answer_id,
                        answer_text,
                        is_correct,
                        key
                    )
                `,
            )
            .eq("game_room_id", gameRoomId)
            .order("question_order", { ascending: true });

        return { data, error };
    },

    /**
     * Fetch ability materials for a game room.
     */
    async getAbilityMaterials(gameRoomId: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("ability_materials")
            .select("*")
            .eq("game_room_id", gameRoomId);

        return { data, error };
    },

    // ======================================== For Round Management & Endgame ========================================
    /**
     * Get alive players in a game room
     */
    async getAlivePlayers(gameId: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("game_players")
            .select("user_id, health, status")
            .eq("game_room_id", gameId)
            .gt("health", 0)
            .eq("status", "alive");

        if (error) {
            throw new Error(
                `[GameRoomRepo] getAlivePlayers Error: ${error.message}`,
            );
        }
        return data || [];
    },

    /**
     * Get the latest match round for a game room
     */
    async getLatestMatchRound(gameId: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("match_rounds")
            .select("round_number")
            .eq("game_room_id", gameId)
            .order("round_number", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            throw new Error(
                `[GameRoomRepo] getLatestMatchRound Error: ${error.message}`,
            );
        }
        return data;
    },

    /**
     * Get players sorted by elimination order (died first come first, alive come last)
     */
    async getPlayersByEliminationOrder(gameId: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("game_players")
            .select("user_id, health, win, eliminated_at, status")
            .eq("game_room_id", gameId)
            .order("eliminated_at", { ascending: true, nullsFirst: false });

        if (error) {
            throw new Error(
                `[GameRoomRepo] getPlayersByEliminationOrder Error: ${error.message}`,
            );
        }
        return data || [];
    },

    /**
     * Prepare next round by upserting match_rounds record
     */
    async upsertNextRound(gameId: string, nextRoundNumber: number) {
        const supabase = await createClient();
        const { error } = await supabase.from("match_rounds").upsert(
            {
                game_room_id: gameId,
                round_number: nextRoundNumber,
                status: "waiting",
                all_battles_finished: false,
                damage_applied: false,
            },
            { onConflict: "game_room_id,round_number" },
        );

        if (error) {
            throw new Error(
                `[GameRoomRepo] upsertNextRound Error: ${error.message}`,
            );
        }
    },

    /**
     * Activate a match round — upsert with status 'ongoing'.
     * Handles both insert (new round) and update (existing round) idempotently.
     */
    async activateMatchRound(gameId: string, roundNumber: number) {
        const supabase = await createClient();
        const { error } = await supabase.from("match_rounds").upsert(
            {
                game_room_id: gameId,
                round_number: roundNumber,
                status: "ongoing",
                all_battles_finished: false,
                damage_applied: false,
                updated_at: getWIBNow(),
            },
            { onConflict: "game_room_id,round_number" },
        );

        if (error) {
            throw new Error(
                `[GameRoomRepo] activateMatchRound Error: ${error.message}`,
            );
        }
    },

    /**
     * Fetch all participants in a game room with their health and user details.
     */
    async getGamePlayers(roomId: string): Promise<GamePlayerWithUser[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("game_players")
            .select(
                "user_id, health, status, win, created_at, updated_at, users!inner(username, total_trophy)",
            )
            .eq("game_room_id", roomId);

        if (error)
            throw new Error(
                `[EndGameRepo] getGamePlayers Error: ${error.message}`,
            );
        return data as unknown as GamePlayerWithUser[];
    },

    /**
     * Fetch the active character for multiple users.
     */
    async getUserCharacters(userIds: string[]): Promise<UserCharacterSkin[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("user_characters")
            .select("user_id, characters!inner(skin_name, image_url)")
            .in("user_id", userIds)
            .eq("is_used", true);

        if (error)
            throw new Error(
                `[EndGameRepo] getUserCharacters Error: ${error.message}`,
            );
        return data as unknown as UserCharacterSkin[];
    },

    /**
     * Fetch all answers submitted by users in a room, including correctness data.
     */
    async getUserAnswers(roomId: string): Promise<UserAnswerCorrectness[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("user_answers")
            .select(
                `
                user_id,
                round_number,
                created_at,
                answers (is_correct)
            `,
            )
            .eq("game_room_id", roomId);

        if (error)
            throw new Error(
                `[EndGameRepo] getUserAnswers Error: ${error.message}`,
            );
        return data as unknown as UserAnswerCorrectness[];
    },

    /**
     * Fetch all battle rooms for a specific game room.
     */
    async getBattleRooms(roomId: string): Promise<BattleRoomData[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("battle_rooms")
            .select("*")
            .eq("game_room_id", roomId);
        if (error)
            throw new Error(
                `[EndGameRepo] getBattleRooms Error: ${error.message}`,
            );
        return (data || []) as BattleRoomData[];
    },

    /**
     * Fetch correctness info for a list of answer IDs.
     */
    async getCorrectAnswers(answerIds: string[]): Promise<CorrectAnswerInfo[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("answers")
            .select("answer_id, is_correct")
            .in("answer_id", answerIds);
        if (error)
            throw new Error(
                `[EndGameRepo] getCorrectAnswers Error: ${error.message}`,
            );
        return (data || []) as CorrectAnswerInfo[];
    },

    /**
     * Fetch basic game room configuration.
     */
    async getGameRoom(roomId: string): Promise<EndgameRoomConfig | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("game_rooms")
            .select("total_round, room_status, created_at, updated_at")
            .eq("game_room_id", roomId)
            .maybeSingle();
        if (error)
            throw new Error(
                `[EndGameRepo] getGameRoom Error: ${error.message}`,
            );
        return data as EndgameRoomConfig | null;
    },

    /**
     * Fetch rank details (e.g., max trophy limit).
     */
    async getRankInfo(rankId: number): Promise<RankMaxTrophy | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("ranks")
            .select("max_trophy")
            .eq("rank_id", rankId)
            .maybeSingle();
        if (error)
            throw new Error(
                `[EndGameRepo] getRankInfo Error: ${error.message}`,
            );
        return data as RankMaxTrophy | null;
    },

    /**
     * Fetch abilities owned by a player in a specific room.
     */
    async getUserAbilities(
        roomId: string,
        userId: string,
    ): Promise<UserAbilityStock[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("ability_players")
            .select("ability_id, stock")
            .eq("user_id", userId)
            .eq("game_room_id", roomId);
        if (error)
            throw new Error(
                `[EndGameRepo] getUserAbilities Error: ${error.message}`,
            );
        return (data || []) as UserAbilityStock[];
    },

    /**
     * Fetch core user statistics and currency.
     */
    async getUserData(userId: string): Promise<UserStatsInfo | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("users")
            .select(
                "total_trophy, coin, total_match, total_rank_1, placement_ratio",
            )
            .eq("user_id", userId)
            .maybeSingle();
        if (error)
            throw new Error(
                `[EndGameRepo] getUserData Error: ${error.message}`,
            );
        return data as UserStatsInfo | null;
    },

    /**
     * Update the user_games record for a player's match result.
     */
    async updateUserGame(
        userId: string,
        roomId: string,
        dataParams: Partial<UserGameRecord>,
    ): Promise<unknown> {
        console.log(
            `[EndgameRepo] Upserting user_game for user=${userId}, room=${roomId}`,
        );
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("user_games")
            .upsert(
                {
                    user_id: userId,
                    game_room_id: roomId,
                    ...dataParams,
                    updated_at: getWIBNow(),
                },
                { onConflict: "game_room_id, user_id" },
            )
            .select();
        if (error)
            throw new Error(
                `[EndGameRepo] updateUserGame Error: ${error.message}`,
            );
        return data;
    },

    /**
     * Update a user's global statistics (trophy, coin, matches, etc.).
     */
    async updateUserStats(
        userId: string,
        dataParams: Partial<UserStatsInfo>,
    ): Promise<unknown> {
        console.log(`[EndGameRepo] Updating user_stats for user=${userId}`);
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("users")
            .update({
                ...dataParams,
                updated_at: getWIBNow(),
            })
            .eq("user_id", userId)
            .select();
        if (error)
            throw new Error(
                `[EndGameRepo] updateUserStats Error: ${error.message}`,
            );
        return data;
    },

    /**
     * Set the game room status to finished.
     */
    async updateGameRoomStatus(roomId: string, status: string): Promise<null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("game_rooms")
            .update({
                room_status: status,
                updated_at: getWIBNow(),
            })
            .eq("game_room_id", roomId);
        if (error)
            throw new Error(
                `[EndGameRepo] updateGameRoomStatus Error: ${error.message}`,
            );
        return data;
    },

    /**
     * Set the game room status specifically for processing locks.
     * Uses the admin client to bypass RLS.
     */
    async lockRoomForProcessing(
        roomId: string,
        expectedStatus: "playing" | "open" | "processing" = "playing",
    ): Promise<boolean> {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminSupabase = createAdminClient();

        const { data, error } = await adminSupabase
            .from("game_rooms")
            .update({
                room_status: "processing",
                updated_at: new Date().toISOString(),
            })
            .eq("game_room_id", roomId)
            .eq("room_status", expectedStatus)
            .select();

        if (error) {
            throw new Error(
                `[EndGameRepo] lockRoomForProcessing Error: ${error.message}`,
            );
        }
        if (!data || data.length === 0) return false;
        return true;
    },

    /**
     * Mark the game room as finished using the admin client.
     */
    async finishRoomProcessing(roomId: string): Promise<boolean> {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminSupabase = createAdminClient();

        const { data, error } = await adminSupabase
            .from("game_rooms")
            .update({
                room_status: "finished",
                updated_at: new Date().toISOString(),
            })
            .eq("game_room_id", roomId)
            .eq("room_status", "processing")
            .select();

        if (error) {
            throw new Error(
                `[EndGameRepo] lockRoomForProcessing Error: ${error.message}`,
            );
        }
        if (!data || data.length === 0) return false;
        return true;
    },

    /**
     * Revert the game room status from processing to playing.
     */
    async revertRoomProcessing(roomId: string): Promise<void> {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminSupabase = createAdminClient();

        const { error } = await adminSupabase
            .from("game_rooms")
            .update({
                room_status: "playing",
                updated_at: new Date().toISOString(),
            })
            .eq("game_room_id", roomId)
            .eq("room_status", "processing");

        if (error) {
            throw new Error(
                `[EndGameRepo] revertRoomProcessing Error: ${error.message}`,
            );
        }
    },

    /**
     * Get the start time of the first round for a more accurate match start.
     */
    async getEarliestRoundTime(
        roomId: string,
    ): Promise<EarliestRoundTime | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("match_rounds")
            .select("created_at")
            .eq("game_room_id", roomId)
            .order("round_number", { ascending: true })
            .limit(1)
            .maybeSingle();
        if (error)
            throw new Error(
                `[EndGameRepo] getEarliestRoundTime Error: ${error.message}`,
            );
        return data as EarliestRoundTime | null;
    },

    /**
     * Find existing battle room IDs for a specific round
     */
    async findExistingBattleRooms(
        gameId: string,
        roundNumber: number,
    ): Promise<{ battle_room_id: string }[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("battle_rooms")
            .select("battle_room_id")
            .eq("game_room_id", gameId)
            .eq("round_number", roundNumber);

        if (error) {
            console.error(
                "[BattleRoomRepo] Error finding existing battle rooms:",
                error,
            );
            throw new Error(error.message);
        }
        return data || [];
    },

    /**
     * Delete battle rooms for a specific round (idempotent delete)
     * Returns true if successful, throws on fatal error
     */
    async deleteBattleRoomsForRound(
        gameId: string,
        roundNumber: number,
    ): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from("battle_rooms")
            .delete()
            .eq("game_room_id", gameId)
            .eq("round_number", roundNumber);

        if (error) {
            console.error(
                "[BattleRoomRepo] Error deleting battle rooms for round:",
                error,
            );
            throw new Error(error.message);
        }
    },

    /**
     * Get all players for a game, ordered by creation
     */
    async getPlayers(gameId: string): Promise<PlayerWithHealth[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("game_players")
            .select("user_id, health, status")
            .eq("game_room_id", gameId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("[BattleRoomRepo] Error fetching players:", error);
            throw new Error(error.message);
        }
        return data || [];
    },

    /**
     * Insert a new battle room
     */
    async insertBattleRoom(
        battleRoomData: Omit<
            BattleRoom,
            | "battle_room_id"
            | "first_answer_user_id"
            | "first_answer_id"
            | "created_at"
            | "updated_at"
        >,
    ): Promise<{ data: BattleRoom | null; error: unknown }> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("battle_rooms")
            .insert(battleRoomData)
            .select()
            .maybeSingle();

        // We return error here intentionally because caller handles duplicate key (23505) logic
        return { data: data as BattleRoom | null, error };
    },

    /**
     * Get all battle rooms for a specific round
     */
    async getAllBattleRoomsForRound(
        gameId: string,
        roundNumber: number,
    ): Promise<BattleRoom[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("battle_rooms")
            .select("*")
            .eq("game_room_id", gameId)
            .eq("round_number", roundNumber)
            .order("battle_room_id", { ascending: true });

        if (error) {
            console.error(
                "[BattleRoomRepo] Error fetching battle rooms:",
                error,
            );
            throw new Error(error.message);
        }
        return data || [];
    },
    /**
     * Get only the player IDs for battle rooms in a round (for verification)
     */
    async getBattleRoomsPlayers(
        gameId: string,
        roundNumber: number,
    ): Promise<
        { player1_id: string; player2_id: string; player3_id: string | null }[]
    > {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("battle_rooms")
            .select("player1_id, player2_id, player3_id")
            .eq("game_room_id", gameId)
            .eq("round_number", roundNumber);

        if (error) {
            console.error(
                "[BattleRoomRepo] Error fetching room players:",
                error,
            );
            throw new Error(error.message);
        }
        return data || [];
    },

    /**
     * Update the status of a battle room
     */
    async updateBattleRoomStatus(
        battleRoomId: string,
        status: "waiting" | "ongoing" | "finished" | "timeout",
    ): Promise<BattleRoom | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("battle_rooms")
            .update({
                status,
                updated_at: getWIBNow(),
            })
            .eq("battle_room_id", battleRoomId)
            .select()
            .maybeSingle();

        if (error) {
            console.error(
                "[BattleRoomRepo] Error updating battle room status:",
                error,
            );
            throw new Error(error.message);
        }
        return data as BattleRoom | null;
    },
    /**
     * Broadcast game ended event via realtime WebSocket.
     */
    async broadcastGameEnded(gameId: string, players: any[]): Promise<void> {
        const supabase = await createClient();
        const channel = supabase.channel(`room:${gameId}`);
        await channel.send({
            type: "broadcast",
            event: "game_ended",
            payload: {
                game_room_id: gameId,
                message: "Game has ended!",
                players: players || [],
            },
        });
        console.log(`[GameRoomRepo] Broadcasted game_ended for room ${gameId}`);
    },
};
