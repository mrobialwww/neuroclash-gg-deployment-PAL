import { createClient } from "@/lib/supabase/server";
import { calculateRewards } from "@/lib/game/rewardCalculator";
import { getWIBNow } from "@/lib/utils/dateUtils";
import {
    ParticipantRecord,
    PlayerMatchState,
    UserGameRecord,
} from "@/modules/gamePlayers/gamePlayers.schema";
import { createAdminClient } from "@/lib/supabase/admin";

export const gamePlayersRepository = {
    /**
     * Get answer detail and record solo answer
     */
    async recordSoloAnswer(
        userId: string,
        answerId: string,
        roomId: string,
        roundNumber: number,
    ) {
        const supabase = await createClient();

        // 1. Get answer detail
        const { data: answerDetail, error: answerError } = await supabase
            .from("answers")
            .select("is_correct, question_id")
            .eq("answer_id", answerId)
            .single();

        if (answerError || !answerDetail) {
            console.error(
                "[GamePlayerRepo] Failed to fetch answer detail:",
                answerError,
            );
            throw new Error("Answer not found");
        }

        // 2. Record the answer in user_answers
        const { error: insertError } = await supabase
            .from("user_answers")
            .insert({
                user_id: userId,
                answer_id: answerId,
                game_room_id: roomId,
                round_number: roundNumber,
            });

        if (insertError && insertError.code !== "23505") {
            // Duplicate answers (23505) are ignored
            console.error(
                "[GamePlayerRepo] Failed to insert user_answer:",
                insertError,
            );
            throw new Error("Failed to record answer");
        }

        return answerDetail;
    },

    /**
     * Increment a specific ability (StarBox item) for a player in a game room
     */
    async incrementPlayerAbility(
        roomId: string,
        playerId: string,
        abilityId: number,
    ) {
        // Use service role client (db) to bypass RLS for other players
        const supabaseAdmin = createAdminClient();
        const { data, error } = await supabaseAdmin.rpc("increment_ability", {
            p_game_room_id: roomId,
            p_ability_id: abilityId,
            p_user_id: playerId,
        });

        if (error) {
            console.error(
                `[GamePlayerRepo] Error incrementing ability ${abilityId} for ${playerId}:`,
                error,
            );
            throw new Error(error.message);
        }

        return data;
    },

    /**
     * Insert semua pemain saat match dimulai dengan health 100
     */
    async insertPlayers(roomId: string, userIds: string[]) {
        console.log(
            `[GamePlayerRepo] insertPlayers called for roomId: ${roomId}, userIds: ${userIds.length}`,
        );

        const supabase = await createClient();

        const players = userIds.map((user_id) => ({
            game_room_id: roomId,
            user_id,
            health: 100,
            status: "alive",
            created_at: getWIBNow(),
        }));

        console.log(
            `[GamePlayerRepo] Inserting ${players.length} players with initial data`,
        );

        const { data, error } = await supabase
            .from("game_players")
            .insert(players)
            .select()
            .order("created_at", { ascending: true });

        if (error) {
            console.error("[GamePlayerRepo] insertPlayers error:", error);
            console.error("[GamePlayerRepo] Error code:", error.code);
            console.error("[GamePlayerRepo] Error message:", error.message);
            console.error("[GamePlayerRepo] Error details:", error.details);
            console.error("[GamePlayerRepo] Error hint:", error.hint);
            throw error;
        }

        console.log(
            `[GamePlayerRepo] Successfully inserted ${
                data?.length || 0
            } players`,
        );

        return data;
    },

    /**
     * Ambil semua partisipan dalam suatu game room dari tabel game_players.
     * Melakukan join dengan tabel characters dan users untuk data UI.
     */
    async getParticipants(roomId: string): Promise<PlayerMatchState[]> {
        console.log(
            `[GamePlayerRepo] getParticipants called for roomId: ${roomId}`,
        );

        const supabase = await createClient();

        // Step 1: Fetch game_players (without join first)
        const { data: gamePlayers, error: gamePlayersError } = await supabase
            .from("game_players")
            .select("user_id, health, status")
            .eq("game_room_id", roomId);

        if (gamePlayersError) {
            console.error(
                "[GamePlayerRepo] getPlayers error:",
                gamePlayersError,
            );
            console.error(
                "[GamePlayerRepo] Error code:",
                gamePlayersError.code,
            );
            console.error(
                "[GamePlayerRepo] Error message:",
                gamePlayersError.message,
            );
            return [];
        }

        console.log(
            `[GamePlayerRepo] Found ${gamePlayers?.length || 0} game_players`,
        );

        // Log raw data for debugging
        console.log(
            `[GamePlayerRepo] Raw game_players data:`,
            JSON.stringify(gamePlayers, null, 2),
        );

        if (!gamePlayers || gamePlayers.length === 0) {
            console.warn(
                `[GamePlayerRepo] No players found in game_players for roomId: ${roomId}`,
            );
            return [];
        }

        // Step 2: Fetch all user data for these user_ids
        const userIds = gamePlayers.map((gp: any) => gp.user_id);
        console.log(
            `[GamePlayerRepo] Fetching user data for ${userIds.length} users`,
        );

        const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("user_id, username")
            .in("user_id", userIds);

        if (usersError) {
            console.error("[GamePlayerRepo] Error fetching users:", usersError);
            console.error(
                "[GamePlayerRepo] Users error code:",
                usersError.code,
            );
            console.error(
                "[GamePlayerRepo] Users error message:",
                usersError.message,
            );
        }

        console.log(`[GamePlayerRepo] Fetched ${usersData?.length || 0} users`);
        console.log(
            `[GamePlayerRepo] Users data:`,
            JSON.stringify(usersData, null, 2),
        );

        // Create a map of user_id -> username for quick lookup
        const userMap = new Map(
            (usersData || []).map((u: any) => [u.user_id, u.username]),
        );

        // Step 3: For each player, fetch equipped character using Supabase
        // Using same approach as lobby: query FROM characters and JOIN to user_characters
        const mappedPlayers = await Promise.all(
            gamePlayers.map(async (row: any, idx: number) => {
                console.log(
                    `[GamePlayerRepo] Processing player ${
                        idx + 1
                    }: ${row.user_id.substring(0, 8)}`,
                );

                try {
                    // Get username from userMap
                    const username = userMap.get(row.user_id);
                    console.log(
                        `[GamePlayerRepo] Username for user ${row.user_id.substring(
                            0,
                            8,
                        )}:`,
                        username,
                    );

                    // Fetch equipped character menggunakan admin client untuk mem-Bypass RLS
                    // (karena getPlayers dipanggil via server route tanpa cookie session)

                    const adminSupabase = createAdminClient();
                    const { data: charData, error: charError } =
                        await adminSupabase
                            .from("characters")
                            .select(
                                "skin_name, image_url, user_characters!inner(user_id, is_used)",
                            )
                            .eq("user_characters.user_id", row.user_id)
                            .eq("user_characters.is_used", true)
                            .limit(1)
                            .maybeSingle();

                    if (charError) {
                        console.error(
                            `[GamePlayerRepo] ❌ Error fetching character for user ${row.user_id.substring(
                                0,
                                8,
                            )}:`,
                            charError,
                        );
                    }

                    console.log(
                        `[GamePlayerRepo] Character data for user ${row.user_id.substring(
                            0,
                            8,
                        )}:`,
                        JSON.stringify(charData, null, 2),
                    );

                    // Extract character data - charData contains skin_name and image_url directly
                    const skin_name = charData?.skin_name || "Slime";
                    const image_url =
                        charData?.image_url || "/default/Slime.webp";

                    const mappedPlayer = {
                        id: row.user_id,
                        name: username || "Unknown",
                        image: image_url, // Changed from avatar to image to match Player interface
                        character: skin_name,
                        health: row.health ?? 100,
                        maxHealth: 100, // Added maxHealth to fix NaN percentage in PlayerGridCard
                        is_alive: row.status === "alive",
                        score: 0,
                    };

                    console.log(
                        `[GamePlayerRepo] ✅ Mapped player ${idx + 1}:`,
                        {
                            id: mappedPlayer.id.substring(0, 8),
                            name: mappedPlayer.name,
                            character: mappedPlayer.character,
                            image: mappedPlayer.image,
                            health: mappedPlayer.health,
                            maxHealth: mappedPlayer.maxHealth,
                        },
                    );

                    return mappedPlayer;
                } catch (err) {
                    console.error(
                        `[GamePlayerRepo] ❌ Error fetching data for player ${
                            idx + 1
                        }:`,
                        err,
                    );
                    // Return default data if fetch fails
                    return {
                        id: row.user_id,
                        name: "Unknown",
                        image: "/default/Slime.webp",
                        character: "Slime",
                        health: row.health ?? 100,
                        maxHealth: 100,
                        is_alive: row.status === "alive",
                        score: 0,
                    };
                }
            }),
        );

        console.log(
            `[GamePlayerRepo] Returning ${mappedPlayers.length} mapped players`,
        );

        return mappedPlayers;
    },

    /**
     * Get player health untuk user tertentu
     */
    async getPlayerHealth(userId: string, roomId: string): Promise<number> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("game_players")
            .select("health")
            .eq("game_room_id", roomId)
            .eq("user_id", userId)
            .maybeSingle();

        if (error) {
            console.error("[GamePlayerRepo] getPlayerHealth error:", error);
            return 100;
        }

        return data?.health ?? 100;
    },

    /**
     * Update user_games ketika player mati
     * - win = game_players.win
     * - lose = eliminated_at - win
     * - trophy_won berdasarkan formula peringkat
     * - coins_earned = trophy_won + (3/4 * trophy_won)
     */
    async updateUserGamesOnDeath(
        userId: string,
        roomId: string,
        roundNumber: number,
    ) {
        const supabase = await createClient();

        console.log(
            `[GamePlayerRepo] ==================================================`,
        );
        console.log(
            `[GamePlayerRepo] updateUserGamesOnDeath START: userId=${userId.substring(
                0,
                8,
            )}, roomId=${roomId.substring(0, 8)}, round=${roundNumber}`,
        );
        console.log(
            `[GamePlayerRepo] ==================================================`,
        );

        // 1. Get win count dari game_players and room info
        const { data: playerData, error: playerError } = await supabase
            .from("game_players")
            .select("win, eliminated_at, game_rooms(total_round)")
            .eq("user_id", userId)
            .eq("game_room_id", roomId)
            .maybeSingle();

        if (playerError) {
            console.error(
                "[GamePlayerRepo] Error fetching player data:",
                playerError,
            );
            return null;
        }

        const winCount = playerData?.win || 0;
        const totalRounds = (playerData as any)?.game_rooms?.total_round || 15;
        const loseCount = Math.max(0, totalRounds - winCount);

        console.log(
            `[GamePlayerRepo] Player stats: win=${winCount}, total_round=${totalRounds}, calculated_lose=${loseCount}`,
        );

        // 2. Hitung placement saat ini (berapa player yang sudah mati)
        const { data: allPlayers } = await supabase
            .from("game_players")
            .select("user_id, status, eliminated_at")
            .eq("game_room_id", roomId)
            .order("eliminated_at", { ascending: true, nullsFirst: false });

        const totalPlayers = allPlayers?.length || 0;

        // Sort players: died players first (by eliminated_at), then alive players
        // This gives us the elimination order
        const sortedPlayers = [...(allPlayers || [])].sort((a, b) => {
            if (a.status === "died" && b.status === "died") {
                return (a.eliminated_at || 0) - (b.eliminated_at || 0);
            }
            if (a.status === "died") return -1;
            if (b.status === "died") return 1;
            return 0;
        });

        // Find current player's position in the sorted list
        const playerIndex = sortedPlayers.findIndex(
            (p) => p.user_id === userId,
        );
        // Placement: first eliminated = last place, last survivor = 1st place
        const placement = totalPlayers - playerIndex;

        console.log(
            `[GamePlayerRepo] Placement calculation: total=${totalPlayers}, playerIndex=${playerIndex}, placement=${placement}`,
        );

        // 3. Hitung trophy dan koin menggunakan shared calculator
        // Reuse totalRounds from line 366

        // Fetch ability boosts
        const { data: abilityPlayers } = await supabase
            .from("ability_players")
            .select("ability_id, stock")
            .eq("user_id", userId)
            .eq("game_room_id", roomId);

        let trophyBoost = 0;
        let coinBoost = 0;

        if (abilityPlayers) {
            const piala = abilityPlayers.find((a: any) => a.ability_id === 5);
            if (piala) trophyBoost = Math.round(piala.stock * 5);

            const kantong = abilityPlayers.find((a: any) => a.ability_id === 6);
            if (kantong) coinBoost = Math.round(kantong.stock * 5);
        }

        const { trophyWon, coinsEarned } = calculateRewards({
            rank: placement,
            totalPlayers,
            totalRounds,
            wins: winCount,
            losses: loseCount,
            trophyBoost,
            coinBoost,
        });

        console.log(
            `[GamePlayerRepo] Shared Calculator: Rank=${placement}, trophy=${trophyWon}, coins=${coinsEarned}`,
        );

        // 5. Cek apakah record user_games sudah ada
        console.log(
            `[GamePlayerRepo] Checking user_games record for user=${userId.substring(
                0,
                8,
            )}, room=${roomId.substring(0, 8)}`,
        );

        const { data: existingRecords, error: checkError } = await supabase
            .from("user_games")
            .select("user_game_id, game_room_id, user_id")
            .eq("game_room_id", roomId)
            .eq("user_id", userId);

        console.log(
            `[GamePlayerRepo] Existing user_games records:`,
            existingRecords,
        );
        console.log(`[GamePlayerRepo] Check error:`, checkError);

        // 6. Update atau Insert user_games
        let updateResult;
        let error;

        if (existingRecords && existingRecords.length > 0) {
            // Record exists, update it
            console.log(
                `[GamePlayerRepo] Updating existing user_games record: ${existingRecords[0].user_game_id}`,
            );
            const result = await supabase
                .from("user_games")
                .update({
                    win: winCount,
                    lose: loseCount,
                    trophy_won: trophyWon,
                    coins_earned: coinsEarned,
                    updated_at: getWIBNow(),
                })
                .eq("game_room_id", roomId)
                .eq("user_id", userId)
                .select();

            updateResult = result.data;
            error = result.error;
            console.log(`[GamePlayerRepo] Update result:`, updateResult);
            console.log(`[GamePlayerRepo] Update error:`, error);
        } else {
            // Record doesn't exist, insert it
            console.log(
                `[GamePlayerRepo] No existing record found, creating new user_games record...`,
            );
            const result = await supabase
                .from("user_games")
                .insert({
                    game_room_id: roomId,
                    user_id: userId,
                    win: winCount,
                    lose: loseCount,
                    trophy_won: trophyWon,
                    coins_earned: coinsEarned,
                })
                .select();

            updateResult = result.data;
            error = result.error;
            console.log(`[GamePlayerRepo] Insert result:`, updateResult);
            console.log(`[GamePlayerRepo] Insert error:`, error);
        }

        if (error) {
            console.error(
                "[GamePlayerRepo] updateUserGamesOnDeath error:",
                error,
            );
        } else {
            console.log(
                `[GamePlayerRepo] Updated user_games SUCCESS:`,
                updateResult,
            );
            console.log(
                `[GamePlayerRepo] Final stats: Placement=${placement}, Win=${winCount}, Lose=${loseCount}, Trophy=${trophyWon}, Coins=${coinsEarned}`,
            );
        }

        console.log(
            `[GamePlayerRepo] ==================================================`,
        );

        return {
            placement,
            win: winCount,
            lose: loseCount,
            trophy_won: trophyWon,
            coins_earned: coinsEarned,
        };
    },

    /**
     * Update status pemain (alive/eliminated)
     */
    async updateStatus(userId: string, roomId: string, status: string) {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("game_players")
            .update({ status })
            .eq("user_id", userId)
            .eq("game_room_id", roomId)
            .select()
            .maybeSingle();

        if (error) {
            console.error("[GamePlayerRepo] updateStatus error:", error);
            throw error;
        }

        return data;
    },

    /**
     * Increment win count when user answers first and correctly
     */
    async incrementWin(userId: string, roomId: string) {
        const supabase = await createClient();

        console.log(
            `[GamePlayerRepo] incrementWin called: userId=${userId.substring(
                0,
                8,
            )}, roomId=${roomId.substring(0, 8)}`,
        );

        // First get current win count
        const { data: current, error: fetchError } = await supabase
            .from("game_players")
            .select("win")
            .eq("user_id", userId)
            .eq("game_room_id", roomId)
            .maybeSingle();

        if (fetchError) {
            console.error(
                "[GamePlayerRepo] incrementWin fetch error:",
                fetchError,
            );
            throw fetchError;
        }

        if (!current) {
            console.error(
                `[GamePlayerRepo] No player record found to increment win: user=${userId}, room=${roomId}`,
            );
            return null;
        }

        const newWin = (current?.win || 0) + 1;

        console.log(
            `[GamePlayerRepo] Current win: ${
                current?.win || 0
            }, New win: ${newWin}`,
        );

        const { data, error } = await supabase
            .from("game_players")
            .update({ win: newWin })
            .eq("user_id", userId)
            .eq("game_room_id", roomId)
            .select()
            .maybeSingle();

        if (error) {
            console.error("[GamePlayerRepo] incrementWin update error:", error);
            throw error;
        }

        console.log(`[GamePlayerRepo] incrementWin SUCCESS:`, data);
        console.log(
            `[GamePlayerRepo] Player ${userId.substring(
                0,
                8,
            )} won a battle! Win count: ${newWin}`,
        );

        return data;
    },

    /**
     * Get player data including win count
     */
    async getPlayerWithWins(userId: string, roomId: string) {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("game_players")
            .select("user_id, health, status, win")
            .eq("user_id", userId)
            .eq("game_room_id", roomId)
            .maybeSingle();

        if (error) {
            console.error("[GamePlayerRepo] getPlayerWithWins error:", error);
            return null;
        }

        return data;
    },

    /**
     * Delete semua pemain di room saat match selesai
     */
    async deletePlayers(roomId: string) {
        const supabase = await createClient();

        const { error } = await supabase
            .from("game_players")
            .delete()
            .eq("game_room_id", roomId);

        if (error) {
            console.error("[GamePlayerRepo] deletePlayers error:", error);
            throw error;
        }
    },

    /**
     * Mark an answer as the first answer in a battle room
     */
    async markFirstAnswer(
        userId: string,
        answerId: string,
        roundNumber: number,
        battleRoomId: string,
        supabaseClient?: any,
    ): Promise<void> {
        const supabase = supabaseClient || (await createClient());
        const { error } = await supabase
            .from("user_answers")
            .update({
                battle_room_id: battleRoomId,
                is_first_answer: true,
            })
            .eq("user_id", userId)
            .eq("answer_id", answerId)
            .eq("round_number", roundNumber);

        if (error) {
            throw new Error(
                `[GamePlayerRepo] markFirstAnswer Error: ${error.message}`,
            );
        }
    },

    /**
     * Simpan jawaban user ke tabel user_answers.
     */
    async submitAnswer(
        userId: string,
        answer_id: string,
        roomId: string,
        roundNumber: number,
    ) {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("user_answers")
            .insert({
                user_id: userId,
                answer_id: answer_id,
                game_room_id: roomId,
                round_number: roundNumber,
            })
            .select()
            .maybeSingle();

        if (error) {
            console.error("[MatchRepo] submitAnswer error:", error);
            throw error;
        }

        return data;
    },

    /**
     * Update health user di tabel game_players.
     * Update health pemain setelah jawaban diproses
     * Jika health <= 0, update status menjadi "died", catat round eliminasi,
     * dan update user_games dengan stats
     */
    async updateHealth(
        userId: string,
        roomId: string,
        newHealth: number,
        roundNumber?: number,
    ) {
        console.log(
            `[MatchRepo] updateHealth called: userId=${userId.substring(
                0,
                8,
            )}, roomId=${roomId.substring(
                0,
                8,
            )}, health=${newHealth}, round=${roundNumber}`,
        );
        const supabase = await createClient();

        console.log(
            `[GamePlayerRepo] updateHealth called: userId=${userId.substring(
                0,
                8,
            )}, roomId=${roomId.substring(
                0,
                8,
            )}, health=${newHealth}, round=${roundNumber}`,
        );

        // Jika health <= 0, set status ke "died" dan catat round eliminasi
        const updateData: {
            health: number;
            status?: string;
            eliminated_at?: number;
        } = {
            health: newHealth,
        };
        if (newHealth <= 0) {
            updateData.status = "died";
            updateData.eliminated_at = roundNumber || 0;
            console.log(
                `[GamePlayerRepo] Player will be marked as died at round ${roundNumber}`,
            );
        }

        const { data, error } = await supabase
            .from("game_players")
            .update(updateData)
            .eq("user_id", userId)
            .eq("game_room_id", roomId)
            .select()
            .maybeSingle();

        if (error) {
            console.error("[GamePlayerRepo] updateHealth error:", error);
            throw error;
        }

        console.log(`[GamePlayerRepo] updateHealth success:`, data);

        // Log jika player mati
        if (newHealth <= 0) {
            console.log(
                `[GamePlayerRepo] Player ${userId.substring(
                    0,
                    8,
                )} has died at round ${roundNumber}`,
            );

            // Update user_games dengan stats
            if (roundNumber) {
                console.log(
                    `[GamePlayerRepo] Calling updateUserGamesOnDeath...`,
                );
                await this.updateUserGamesOnDeath(userId, roomId, roundNumber);
            }
        }
        return data;
    },

    /**
     * Mendapatkan detail jawaban (apakah benar) dari answerId.
     */
    async getAnswerDetail(answer_id: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("answers")
            .select("is_correct, question_id")
            .eq("answer_id", answer_id)
            .maybeSingle();

        if (error) {
            console.error("[MatchRepo] getAnswerDetail error:", error);
            return null;
        }
        return data;
    },

    /**
     * Mendapatkan semua jawaban untuk suatu pertanyaan tertentu di room tertentu.
     * Berguna untuk menentukan siapa yang tercepat.
     */
    async getQuestionAnswers(questionId: string, supabaseClient?: any) {
        const supabase = supabaseClient || (await createClient());
        const { data, error } = await supabase
            .from("user_answers")
            .select("user_id, created_at, answer_id, answers(is_correct)")
            .eq("answer_id", questionId); // Wait, user_answers links to answer_id, which links to question_id.

        // Correction: need to join with answers to filter by question_id
        const { data: correctData, error: correctError } = await supabase
            .from("user_answers")
            .select(
                `
                    user_id,
                    created_at,
                    answer: answers!inner (
                        is_correct,
                        question_id
                    )
                `,
            )
            .eq("answer.question_id", questionId)
            .order("created_at", { ascending: true });

        if (correctError) {
            console.error(
                "[MatchRepo] getQuestionAnswers error:",
                correctError,
            );
            return [];
        }
        return correctData;
    },

    /**
     * Cek apakah user memiliki buff aktif Attack (ability_id=2) atau Shield (ability_id=4).
     * Buff dianggap aktif jika row-nya masih ada di `ability_players` dengan stock > 0.
     * Dipanggil oleh matchService sebelum menghitung damage final.
     *
     * @returns 2 jika Attack aktif, 4 jika Shield aktif, null jika tidak ada.
     */
    async getActiveAbilityBuff(
        roomId: string,
        userId: string,
        supabaseClient?: any,
    ): Promise<2 | 4 | null> {
        const supabase = supabaseClient || (await createClient());

        const { data, error } = await supabase
            .from("ability_players")
            .select("ability_id, stock")
            .eq("game_room_id", roomId)
            .eq("user_id", userId)
            .in("ability_id", [2, 4])
            .gt("stock", 0);

        console.log(data);

        if (error) {
            console.error("[MatchRepo] getActiveAbilityBuff error:", error);
            return null;
        }

        // Shield diprioritaskan jika keduanya ada bersamaan
        if (data?.some((r: any) => r.ability_id === 4)) return 4;
        if (data?.some((r: any) => r.ability_id === 2)) return 2;
        return null;
    },

    /**
     * Memberikan statistik akhir dari player ketika sudah tereliminasi dari room
     * Terdapat pengecekan apakah user memiliki ability boost coin/trophy
     */
    async playerElimination(
        roomId: string,
        userId: string,
        totalTrophy: number,
        totalCoin: number,
        placement: number,
    ) {
        const supabase = await createClient();
        const abilities = await this.getMyAbilities(roomId, userId);

        // Cek apakah user memiliki ability "PIALA KEJAYAAN"
        const ability5 = abilities?.find((a) => a.ability_id === 5);
        if (ability5) {
            totalTrophy += ((totalTrophy * 5) / 100) * ability5.stock;
        }

        // Cek apakah user memiliki ability "KANTONG HARTA"
        const ability6 = abilities?.find((a) => a.ability_id === 6);
        if (ability6) {
            totalCoin += ((totalCoin * 5) / 100) * ability6.stock;
        }

        const { error } = await supabase.rpc("submit_game_result", {
            p_user_id: userId,
            p_game_room_id: roomId,
            p_trophy_won: totalTrophy,
            p_coins_earned: totalCoin,
            p_placement: placement, // Peringkat akhir pemain (misal: 5)
        });

        if (error) {
            console.error("Supabase RPC Error:", error);
            return null;
        }
    },

    /**
     * POST /api/user-game/join/[game_room_id]
     * Check if a room exists before joining
     */
    async checkRoomExists(roomId: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("game_rooms")
            .select(
                "game_room_id, room_code, room_status, max_player, category",
            )
            .eq("game_room_id", roomId)
            .maybeSingle();
        return { data, error };
    },

    /**
     * Check if user is already in a room
     */
    async checkUserJoined(roomId: string, userId: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("user_games")
            .select("user_game_id")
            .eq("game_room_id", roomId)
            .eq("user_id", userId)
            .maybeSingle();
        return { data, error };
    },

    /**
     * Insert user into room
     */
    async insertUserGame(
        roomId: string,
        userId: string,
    ): Promise<{ data: UserGameRecord | null; error: any }> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("user_games")
            .insert({
                game_room_id: roomId,
                user_id: userId,
                created_at: getWIBNow(),
            })
            .select()
            .single();
        return { data, error };
    },

    /**
     * GET /api/user-game/participants/[game_room_id]
     * Returns all user_games records for a given room.
     */
    async getUserGameResults(gameRoomId: string): Promise<ParticipantRecord[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("user_games")
            .select("*")
            .eq("game_room_id", gameRoomId);

        if (error) {
            console.error(
                "[UserGameRepo] getParticipants error:",
                error.message,
            );
            throw new Error(error.message);
        }

        return data || [];
    },

    /**
     * DELETE /api/user-game/leave/[user_game_id]
     * Removes the user_game record (used on exit / quiz completion).
     * Gunakan Service Role Key (createAdminClient) untuk bypass masalah RLS saat DELETE.
     */
    async leaveGame(userGameId: string): Promise<boolean> {
        try {
            const supabaseAdmin = createAdminClient();

            const { error } = await supabaseAdmin
                .from("user_games")
                .delete()
                .eq("user_game_id", userGameId);

            if (error) {
                console.error(
                    "[GamePlayerRepo] leaveGame error:",
                    error.message,
                );
                throw new Error(error.message);
            }

            return true;
        } catch (error) {
            console.error("[GamePlayerRepo] leaveGame exception:", error);
            throw error instanceof Error ? error : new Error(String(error));
        }
    },

    // =========================== Ability Player Repository ===========================
    /**
     * Catat pilihan ability user ke DB via RPC `increment_ability`.
     * RPC dipakai (bukan query biasa) karena prosesnya atomik:
     * jika row sudah ada → increment `stock`, jika belum → INSERT baru.
     */
    async insertPlayerAbility(
        gameRoomId: string,
        abilityId: string,
        userId: string,
    ) {
        const supabase = await createClient();

        const { data, error } = await supabase.rpc("increment_ability", {
            p_game_room_id: gameRoomId,
            p_ability_id: Number(abilityId),
            p_user_id: userId,
        });

        if (error) {
            console.error(
                "[AbilityPlayerRepo] insertPlayerAbility error:",
                error,
            );
            throw error;
        }

        return data;
    },

    /**
     * Ambil semua ability milik user dalam satu room (JOIN ke tabel abilities).
     * Dipanggil saat `initGameData` untuk hydrate `myInventory` dari DB,
     */
    async getMyAbilities(gameRoomId: string, userId: string) {
        const supabase = await createClient();

        const { data: abilityPlayers, error: apError } = await supabase
            .from("ability_players")
            .select(
                `
                ability_player_id,
                game_room_id,
                ability_id,
                stock,
                user_id,
                abilities(name, description, image, empty_image)
                `,
            )
            .eq("game_room_id", gameRoomId)
            .eq("user_id", userId);

        if (apError) {
            console.error("[AbilityPlayerRepo] getMyAbilities error:", apError);
            throw apError;
        }
        const { data: materials, error: amError } = await supabase
            .from("ability_materials")
            .select("ability_materi_id, title, content")
            .eq("game_room_id", gameRoomId);

        if (amError) {
            console.error(
                "[AbilityPlayerRepo] getMyAbilities material error:",
                amError,
            );
            throw amError;
        }

        // Gabungkan semua material menjadi satu objek untuk ditampilkan di overlay.
        // ability_materials bisa punya banyak row per room (1 per topik dari AI).
        const combinedMaterial: {
            ability_materi_id: string;
            title: string;
            content: string;
        } | null =
            materials && materials.length > 0
                ? {
                      ability_materi_id: materials[0].ability_materi_id,
                      title: materials.map((m) => m.title).join(" | "),
                      content: materials
                          .map((m) => m.content)
                          .join("\n\n---\n\n"),
                  }
                : null;

        return (abilityPlayers ?? []).map((row) => ({
            ...row,
            // Hanya lampirkan material ke ability_id === 1 (tipe Materi/Kitab Pengetahuan)
            ability_materials: row.ability_id === 1 ? combinedMaterial : null,
        }));
    },

    /**
     * Memanggil fungsi supabse rpc untuk mekanisme menggunakan ability heal
     */
    async userHealAbility(roomId: string, userId: string) {
        const supabase = await createClient();

        const { error } = await supabase.rpc("use_healing_potion", {
            p_game_room_id: roomId,
            p_user_id: userId,
        });

        if (error) {
            console.error(
                "[AbilityPlayerRepo] insertPlayerAbility error:",
                error,
            );
            throw error;
        }
    },

    /**
     * Menggunkaan ability Attack atua Shield
     */
    async userAttackorShieldAbility(
        roomId: string,
        userId: string,
        abilityId: number,
    ) {
        const supabase = await createClient();

        const { error } = await supabase.rpc("use_attack_shield_ability", {
            p_game_room_id: roomId,
            p_user_id: userId,
            p_ability_id: abilityId,
        });

        if (error) {
            console.error(
                "[AbilityPlayerRepo] insertPlayerAbility error:",
                error,
            );
            throw error;
        }
    },

    /**
     * Hapus SEMUA ability seluruh pemain dalam satu room.
     * Dipanggil saat game selesai untuk membersihkan data.
     */
    async deletePlayersAbilities(roomId: string) {
        const supabase = await createClient();

        const { error } = await supabase
            .from("ability_players")
            .delete()
            .eq("game_room_id", roomId);

        if (error) {
            console.error("[AbilityPlayerRepo] deletePlayers error:", error);
            throw error;
        }
    },

    // =========================== Ability Room Repository ===========================
    /**
     * Insert ability room berdasarkan total pemain
     * dan sekaligus ambil abilities tersebut untuk ditampilkan di daftar ability starbox
     */
    async initialAbilites(
        gameRoomId: string,
        totalPlayer: number,
        shouldResetDb: boolean = false,
    ) {
        const supabase = await createClient();
        if (shouldResetDb) {
            const calculatedTotal = totalPlayer + Math.ceil(totalPlayer / 5);
            const totalItems = Math.max(6, calculatedTotal);

            const percentages = [
                { id: "1", pct: 15 },
                { id: "2", pct: 15 },
                { id: "3", pct: 15 },
                { id: "4", pct: 15 },
                { id: "5", pct: 20 },
                { id: "6", pct: 20 },
            ];

            // Step 1: Give each ability at least 1 stock
            const initialAbilitiesTemp = percentages.map((p) => {
                return {
                    game_room_id: gameRoomId,
                    ability_id: p.id,
                    stock: 1,
                    pct: p.pct,
                    exact_needed: (p.pct / 100) * totalItems,
                };
            });

            // Step 2: Distribute the remaining stock based on percentages
            let remaining = totalItems - 6;

            if (remaining > 0) {
                // Calculate how many more each should get based on their pct
                const additionalStock = initialAbilitiesTemp.map((a) => {
                    const extra = (a.pct / 100) * totalItems - 1; // Subtract the 1 we already gave
                    const baseExtra = Math.max(0, Math.floor(extra));
                    return {
                        ...a,
                        extraStock: baseExtra,
                        remainder: extra - baseExtra,
                    };
                });

                let secondRemaining =
                    remaining -
                    additionalStock.reduce((sum, a) => sum + a.extraStock, 0);

                // Add the base extra stock
                additionalStock.forEach((a, i) => {
                    initialAbilitiesTemp[i].stock += a.extraStock;
                });

                // Distribute what's left based on largest remainders
                additionalStock.sort((a, b) => b.remainder - a.remainder);
                let idx = 0;
                while (secondRemaining > 0) {
                    const abilityToGhost =
                        additionalStock[idx % additionalStock.length];
                    const mainIdx = initialAbilitiesTemp.findIndex(
                        (ia) => ia.ability_id === abilityToGhost.ability_id,
                    );
                    initialAbilitiesTemp[mainIdx].stock += 1;
                    secondRemaining -= 1;
                    idx += 1;
                }
            }

            const initialAbilities = initialAbilitiesTemp
                .sort((a, b) => Number(a.ability_id) - Number(b.ability_id))
                .map((a) => ({
                    game_room_id: a.game_room_id,
                    ability_id: a.ability_id,
                    stock: a.stock,
                }));

            const { error: upsertErr } = await supabase
                .from("ability_rooms")
                .upsert(initialAbilities, {
                    onConflict: "game_room_id,ability_id",
                });

            if (upsertErr) {
                console.error("[AbilityRoomRepo] upsert error:", upsertErr);
                throw upsertErr;
            }
        }

        const { data, error: selectErr } = await supabase
            .from("ability_rooms")
            .select(
                "ability_id, stock, updated_at, abilities!inner(name, description, image, empty_image)",
            )
            .eq("game_room_id", gameRoomId)
            .order("ability_id", { ascending: true });

        if (selectErr) {
            console.error("[AbilityRoomRepo] get error:", selectErr);
            throw selectErr;
        }

        return data;
    },

    /**
     * Delete semua pemain di room saat match selesai
     */
    async deleteRoomAbility(roomId: string) {
        const supabase = await createClient();

        const { error } = await supabase
            .from("ability_rooms")
            .delete()
            .eq("game_room_id", roomId);

        if (error) {
            console.error("[AbilityRoomRepo] deletePlayers error:", error);
            throw error;
        }
    },
};
