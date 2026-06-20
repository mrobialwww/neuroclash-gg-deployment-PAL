import { gamePlayersRepository } from "@/modules/gamePlayers/gamePlayers.repository";
import { battleRoomRepository } from "@/modules/battles/battle.repository";
import { gameRoomRepository } from "@/modules/games/game.repository";
import { userService } from "@/modules/users/user.service";
import { characterServices } from "@/modules/characters/character.service";
import {
    LobbyInitResult,
    LobbyPlayer,
    ParticipantRecord,
} from "@/modules/gamePlayers/gamePlayers.schema";

export const gamePlayersService = {
    /**
     * Submit a solo game answer
     */
    async submitSoloAnswer(
        userId: string,
        answerId: string,
        roomId: string,
        roundNumber: number,
    ) {
        console.log(`[GamePlayerService] POST /api/solo/submit-answer`);
        console.log(`[GamePlayerService] user_id: ${userId}`);
        console.log(`[GamePlayerService] answer_id: ${answerId}`);
        console.log(`[GamePlayerService] game_room_id: ${roomId}`);
        console.log(`[GamePlayerService] round_number: ${roundNumber}`);

        const answerDetail = await gamePlayersRepository.recordSoloAnswer(
            userId,
            answerId,
            roomId,
            roundNumber,
        );

        console.log(
            `[GamePlayerService] Answer is_correct: ${answerDetail.is_correct}`,
        );
        console.log(`[GamePlayerService] ✅ Solo answer recorded`);

        return answerDetail;
    },

    /**
     * Auto assign abilities to players in a room
     */
    async autoAssignAbilities(
        roomId: string,
        assignments: { playerId: string; abilityId: number | string }[],
    ) {
        console.log(
            `[GamePlayerService] Auto-assigning ${assignments.length} abilities in room ${roomId}`,
        );

        const results = [];
        for (const assignment of assignments) {
            const { playerId, abilityId } = assignment;
            try {
                await gamePlayersRepository.incrementPlayerAbility(
                    roomId,
                    playerId,
                    Number(abilityId),
                );
                results.push({ playerId, abilityId, success: true });
            } catch (error: any) {
                console.error(
                    `[GamePlayerService] Failed assigning to ${playerId}:`,
                    error,
                );
                results.push({
                    playerId,
                    abilityId,
                    success: false,
                    error: error.message,
                });
            }
        }

        const failed = results.filter((r) => !r.success);
        if (failed.length > 0) {
            console.error(
                `[GamePlayerService] Failed auto-assignments:`,
                failed,
            );
        }

        return {
            success: failed.length === 0,
            results,
            failed: failed.length > 0 ? failed : undefined,
        };
    },

    /**
     * Mendapatkan semua partisipan untuk suatu room.
     */
    async getParticipantsList(roomId: string) {
        console.log(
            `[GamePlayerService] ==================================================`,
        );
        console.log(`[GamePlayerService] getParticipantsList START`);
        console.log(`[GamePlayerService] Room ID: ${roomId}`);
        console.log(`[GamePlayerService] Room ID type: ${typeof roomId}`);
        console.log(
            `[GamePlayerService] ==================================================`,
        );

        const participants = await gamePlayersRepository.getParticipants(
            roomId,
        );

        console.log(
            `[GamePlayerService] Repository returned ${participants.length} participants`,
        );
        console.log(
            `[GamePlayerService] Participants type: ${typeof participants}`,
        );
        console.log(`[GamePlayerService] Participants data:`, participants);

        if (participants.length === 0) {
            console.warn(
                `[GamePlayerService] ⚠️ WARNING: No participants found in repository result`,
            );
            console.warn(`[GamePlayerService] Room ID used: ${roomId}`);
        }

        return participants;
    },

    /**
     * Insert pemain ke game_players dengan health awal 100.
     * Idempotent: jika sudah ada (duplicate key), operasi di-skip.
     */
    async insertPlayers(roomId: string, userIds: string[]): Promise<void> {
        try {
            await gamePlayersRepository.insertPlayers(roomId, userIds);
        } catch (insertError: unknown) {
            const err = insertError as { code?: string; message?: string };
            if (
                err?.code === "23505" ||
                err?.message?.includes("duplicate key")
            ) {
                console.log(
                    `[GamePlayerService] Players already exist in game_players for room ${roomId}, skipping insert`,
                );
                return;
            }
            throw insertError;
        }
    },

    /**
     * Menghitung damage berdasarkan rumus: Damage = 5 + (n / N) * 20
     * n = nomor urut soal (currentOrder)
     * N = total soal (totalQuestions)
     */
    calculateDamage(currentOrder: number, totalQuestions: number): number {
        if (!totalQuestions || totalQuestions === 0) return 20; // Default base damage if N is invalid
        const damage = 5 + (currentOrder / totalQuestions) * 20;
        return Math.floor(damage); // We use floor for whole numbers damage
    },

    /**
     * Menentukan siapa pemenang ronde (tercepat & benar) untuk suatu soal.
     * Return user_id pemenang atau null jika tidak ada.
     */
    async determineWinnerOfRound(questionId: string): Promise<string | null> {
        const answers = await gamePlayersRepository.getQuestionAnswers(
            questionId,
        );

        // Filter hanya yang benar
        const correctAnswers = (answers || []).filter(
            (ans: any) => ans?.answer?.is_correct,
        );

        if (correctAnswers.length > 0) {
            // Karena sudah diurutkan berdasarkan created_at ASC di repository,
            // maka elemen pertama adalah pemenang tercepat.
            return correctAnswers[0].user_id;
        }

        return null;
    },

    /**
     * Proses jawaban user saat disubmit.
     * Menghitung apakah user tersebut terkena damage.
     */
    async processAnswerSubmission(
        userId: string,
        answerId: string,
        roundNumber: number,
    ) {
        console.log(
            `[MatchService] Processing answer for userId: ${userId}, answerId: ${answerId}`,
        );

        // 1. Dapatkan detail jawaban
        const answerDetail = await gamePlayersRepository.getAnswerDetail(
            answerId,
        );
        if (!answerDetail) throw new Error("Jawaban tidak ditemukan.");

        const { is_correct, question_id } = answerDetail;
        console.log(
            `[MatchService] Found question_id: ${question_id} for answer_id: ${answerId}`,
        );

        // 2. Dapatkan detail room dan question order melalui question_id
        // Fetch question details
        const questionData = await battleRoomRepository.getQuestionMeta(
            question_id,
        );

        if (!questionData) {
            console.error(
                `[MatchService] Question not found in DB for ID: ${question_id}`,
            );
            throw new Error("Metadata pertanyaan tidak ditemukan di database.");
        }

        const roomId = questionData.game_room_id;
        const currentOrder = questionData.question_order;

        // Fetch room details separately for reliability
        const roomData = await gameRoomRepository.getGameRoom(roomId);

        const totalQuestions = roomData?.total_round || 20;

        console.log(
            `[MatchService] Match details: roomId=${roomId}, order=${currentOrder}, total=${totalQuestions}`,
        );

        // 3. Simpan jawaban ke user_answers (Repo) dengan game_room_id dan round_number
        await gamePlayersRepository.submitAnswer(
            userId,
            answerId,
            roomId,
            roundNumber,
        );

        // 4. Ambil buff aktif dari DB — Shield (4) atau Attack (2)
        // Ini dilakukan server-side agar tidak bisa dimanipulasi dari client.
        const myBuff = await gamePlayersRepository.getActiveAbilityBuff(
            roomId,
            userId,
        );

        // 5. Kalkulasi damage
        const baseDamage = this.calculateDamage(currentOrder, totalQuestions);
        let damageApplied = 0;
        let isWinner = false;

        if (!is_correct) {
            // Jawaban salah → user kena damage.
            // Jika user punya Shield aktif (ability_id=4), kurangi damage yang diterima sebesar 20.
            const receivedDamage = Math.max(
                0,
                baseDamage - (myBuff === 4 ? 20 : 0),
            );
            damageApplied = receivedDamage;

            const participants = await gamePlayersRepository.getParticipants(
                roomId,
            );
            const userState = participants.find((p) => p.id === userId);
            if (userState) {
                await gamePlayersRepository.updateHealth(
                    userId,
                    roomId,
                    Math.max(0, userState.health - receivedDamage),
                );
            }
        } else {
            // Jawaban benar → cek apakah user paling cepat
            const allAnswers = await gamePlayersRepository.getQuestionAnswers(
                question_id,
            );
            const correctOnes = allAnswers.filter(
                (a: any) => a.answer.is_correct,
            );

            if (correctOnes.length > 0 && correctOnes[0].user_id === userId) {
                // User tercepat & benar → winner ronde ini.
                isWinner = true;

                // Jika winner punya Attack buff (ability_id=2), semua lawan kena +10 extra damage.
                // Ini diterapkan di sini (bukan di finalizeRoundDamage) karena hanya winner
                // yang diketahui saat jawaban pertama masuk.
                if (myBuff === 2) {
                    const participants =
                        await gamePlayersRepository.getParticipants(roomId);
                    const opponents = participants.filter(
                        (p) => p.id !== userId && p.health > 0,
                    );

                    await Promise.all(
                        opponents.map((opponent) =>
                            gamePlayersRepository.updateHealth(
                                opponent.id,
                                roomId,
                                Math.max(0, opponent.health - 10),
                            ),
                        ),
                    );
                }
            } else if (correctOnes.length > 1) {
                // Ada yang lebih cepat → user kena damage.
                // Shield (id=4) melindungi; Attack (id=2) hanya menambah damage ke lawan, bukan mengurangi damage yang diterima sendiri.
                const receivedDamage = Math.max(
                    0,
                    baseDamage - (myBuff === 4 ? 20 : 0),
                );
                damageApplied = receivedDamage;

                const participants =
                    await gamePlayersRepository.getParticipants(roomId);
                const userState = participants.find((p) => p.id === userId);
                if (userState) {
                    await gamePlayersRepository.updateHealth(
                        userId,
                        roomId,
                        Math.max(0, userState.health - receivedDamage),
                    );
                }
            }
        }

        return {
            is_correct,
            damageApplied,
            isWinner,
            newHealth: 0,
        };
    },

    /**
     * Proses damage untuk semua pemain yang tidak aman (selain pemenang tercepat).
     * Digunakan saat timer habis untuk finalisasi status ronde.
     */
    async finalizeRoundDamage(
        roomId: string,
        currentOrder: number,
        totalQuestions: number,
    ) {
        const baseDamage = this.calculateDamage(currentOrder, totalQuestions);
        const winnerId = await this.determineWinnerOfRound(roomId);
        const participants = await gamePlayersRepository.getParticipants(
            roomId,
        );

        const updates = participants
            // Hanya player yang bukan pemenang ronde dan masih hidup
            .filter((player) => player.id !== winnerId && player.health > 0)
            .map(async (player) => {
                // Cek Shield aktif untuk setiap player yang akan kena damage
                const playerBuff =
                    await gamePlayersRepository.getActiveAbilityBuff(
                        roomId,
                        player.id,
                    );
                // Shield (id=4): kurangi 20 dari damage yang diterima
                const finalDamage = Math.max(
                    0,
                    baseDamage - (playerBuff === 4 ? 20 : 0),
                );
                const newHealth = Math.max(0, player.health - finalDamage);
                return gamePlayersRepository.updateHealth(
                    player.id,
                    roomId,
                    newHealth,
                );
            });

        if (updates.length > 0) {
            await Promise.all(updates);
        }

        // Jika winner punya Attack buff (id=2), tambahkan +10 extra damage ke semua lawan.
        // Terapkan setelah damage normal selesai diaplikasikan.
        if (winnerId) {
            const winnerBuff = await gamePlayersRepository.getActiveAbilityBuff(
                roomId,
                winnerId,
            );
            if (winnerBuff === 2) {
                const attackUpdates = participants
                    .filter(
                        (player) => player.id !== winnerId && player.health > 0,
                    )
                    .map(async (player) => {
                        // Ambil health terbaru setelah damage ronde normal
                        const fresh =
                            await gamePlayersRepository.getParticipants(roomId);
                        const freshPlayer = fresh.find(
                            (p) => p.id === player.id,
                        );
                        if (!freshPlayer || freshPlayer.health <= 0) return;
                        return gamePlayersRepository.updateHealth(
                            player.id,
                            roomId,
                            Math.max(0, freshPlayer.health - 10),
                        );
                    });
                await Promise.all(attackUpdates);
            }
        }

        return { winnerId, damageApplied: baseDamage };
    },

    /**
     * Orchestrates the business logic for a user joining a game room
     */
    async joinGameRoom(gameRoomId: string, userId: string) {
        console.log("\n" + "=".repeat(80));
        console.log("[JOIN] START DEBUG");
        console.log("=".repeat(80));
        console.log(`[JOIN] game_room_id: ${gameRoomId}`);
        console.log(`[JOIN] user_id: ${userId}`);

        const { data: roomCheck, error: roomCheckError } =
            await gamePlayersRepository.checkRoomExists(gameRoomId);

        if (roomCheckError || !roomCheck) {
            console.error("[JOIN] ❌ Room not found:", roomCheckError);
            throw {
                status: 404,
                message: "Room not found",
                debug: roomCheckError,
            };
        }

        console.log(
            `[JOIN] ✅ Room found: ${roomCheck.room_code}, category: ${roomCheck.category}`,
        );

        const { data: existingJoin, error: existingJoinError } =
            await gamePlayersRepository.checkUserJoined(gameRoomId, userId);

        if (existingJoinError && existingJoinError.code !== "PGRST116") {
            console.error(
                "[JOIN] Error checking existing join:",
                existingJoinError,
            );
        }

        if (existingJoin) {
            console.log("[JOIN] ⚠️ User already joined");
            throw {
                status: 409,
                message: "User already joined this room",
                user_game_id: existingJoin.user_game_id,
            };
        }

        const { data, error } = await gamePlayersRepository.insertUserGame(
            gameRoomId,
            userId,
        );

        if (error || !data) {
            console.error("[JOIN] ❌ Insert error:", error);
            throw {
                status: 500,
                message: "Failed to join room",
                debug: {
                    error_code: error?.code,
                    error_message: error?.message,
                },
            };
        }

        console.log("[JOIN] ✅ SUCCESS - User joined room");
        console.log("=".repeat(80) + "\n");

        return data;
    },

    /**
     * Fetches the raw user_games records for a specific room.
     * Digunakan oleh GET /api/user-game/participants/[game_room_id]
     */
    async getRawParticipants(gameRoomId: string) {
        return await gamePlayersRepository.getUserGameResults(gameRoomId);
    },

    /**
     * Fetches all participants for a room and maps them to LobbyPlayer shape.
     * Needs to cross-reference /api/users/[user_id] for username + avatar.
     * For performance: batch-fetch distinct user_ids in parallel.
     */
    async getParticipantsAsPlayers(gameRoomId: string): Promise<LobbyPlayer[]> {
        const participants = await gamePlayersRepository.getUserGameResults(
            gameRoomId,
        );

        // De-duplicate by user_id (keep latest record per user)
        const uniqueUsers = new Map<string, ParticipantRecord>();
        for (const p of participants) {
            uniqueUsers.set(p.user_id, p);
        }

        // Parallel fetch user profile + active character for each unique user
        const playerPromises = Array.from(uniqueUsers.values()).map(
            async (p) => {
                try {
                    const [userData, charData] = await Promise.all([
                        userService.getUserById(p.user_id),
                        characterServices.getUserCharacters(p.user_id, true),
                    ]);

                    let characterData: {
                        base_character: string;
                        image_url: string;
                    } | null = null;
                    if (charData && charData.length > 0) {
                        characterData = {
                            base_character: charData[0].base_character || "",
                            image_url: charData[0].image_url || "",
                        };
                    }

                    const player: LobbyPlayer = {
                        id: p.user_id,
                        name: userData?.username || "Pemain",
                        character: characterData?.base_character || "Slime",
                        image:
                            characterData?.image_url || "/default/Slime.webp",
                        health: 100,
                        maxHealth: 100,
                    };

                    return player;
                } catch {
                    return null;
                }
            },
        );

        const results = await Promise.all(playerPromises);
        return results.filter((p): p is LobbyPlayer => p !== null);
    },

    /**
     * Remove the user_game record when user exits the lobby or finishes quiz.
     */
    async leaveLobby(userGameId: string): Promise<void> {
        await gamePlayersRepository.leaveGame(userGameId);
    },

    // =========================== Ability Service Wrappers ===========================

    async insertPlayerAbility(
        gameRoomId: string,
        abilityId: string,
        userId: string,
    ) {
        return await gamePlayersRepository.insertPlayerAbility(
            gameRoomId,
            abilityId,
            userId,
        );
    },

    async getMyAbilities(gameRoomId: string, userId: string) {
        return await gamePlayersRepository.getMyAbilities(gameRoomId, userId);
    },

    async userHealAbility(roomId: string, userId: string) {
        return await gamePlayersRepository.userHealAbility(roomId, userId);
    },

    async userAttackorShieldAbility(
        roomId: string,
        userId: string,
        abilityId: number,
    ) {
        return await gamePlayersRepository.userAttackorShieldAbility(
            roomId,
            userId,
            abilityId,
        );
    },

    async deletePlayersAbilities(roomId: string) {
        return await gamePlayersRepository.deletePlayersAbilities(roomId);
    },

    async initialAbilites(
        gameRoomId: string,
        totalPlayer: number,
        shouldResetDb: boolean = false,
    ) {
        return await gamePlayersRepository.initialAbilites(
            gameRoomId,
            totalPlayer,
            shouldResetDb,
        );
    },

    async deleteRoomAbility(roomId: string) {
        return await gamePlayersRepository.deleteRoomAbility(roomId);
    },

    async getAnswerDetail(answerId: string) {
        return await gamePlayersRepository.getAnswerDetail(answerId);
    },

    async submitAnswer(
        userId: string,
        answerId: string,
        gameId: string,
        roundNumber: number,
    ) {
        return await gamePlayersRepository.submitAnswer(
            userId,
            answerId,
            gameId,
            roundNumber,
        );
    },

    async markFirstAnswer(
        userId: string,
        answerId: string,
        roundNumber: number,
        battleRoomId: string,
    ) {
        return await gamePlayersRepository.markFirstAnswer(
            userId,
            answerId,
            roundNumber,
            battleRoomId,
        );
    },

    async getActiveAbilityBuff(gameId: string, userId: string) {
        return await gamePlayersRepository.getActiveAbilityBuff(gameId, userId);
    },

    async updateHealth(
        playerId: string,
        gameId: string,
        health: number,
        roundNumber: number,
    ) {
        return await gamePlayersRepository.updateHealth(
            playerId,
            gameId,
            health,
            roundNumber,
        );
    },

    async incrementWin(userId: string, gameId: string) {
        return await gamePlayersRepository.incrementWin(userId, gameId);
    },
};
