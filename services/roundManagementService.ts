import { GAME_CONSTANTS } from "@/lib/game/gameConstants";
import { battleRoomService } from "@/modules/battles/battle.service";
import { gamePlayersService } from "@/modules/gamePlayers/gamePlayers.service";
import { gameRoomService } from "@/modules/games/game.service";

export const roundManagementService = {
    /**
     * Calculate damage based on round number and total questions
     * Formula: Damage = 5 + (n / N) * 20
     * n = round number
     * N = total questions
     */
    calculateDamage(roundNumber: number, totalQuestions: number): number {
        if (!totalQuestions || totalQuestions === 0)
            return GAME_CONSTANTS.BASE_DAMAGE;

        let damage =
            GAME_CONSTANTS.ROUND_DAMAGE_MIN +
            (roundNumber / totalQuestions) * GAME_CONSTANTS.ROUND_DAMAGE_SCALE;

        return Math.floor(damage);
    },

    /**
     * Process answer submission:
     * 1. Check if this is the first answer in the battle room
     * 2. If first, record it and mark others as unable to answer
     * 3. Check if battle room is finished
     * 4. Check if all battle rooms are finished
     * 5. If all finished, apply damage and check for next round
     */
    async processAnswer(
        userId: string,
        answerId: string,
        battleRoomId: string,
        gameId: string,
        roundNumber: number,
    ): Promise<{
        success: boolean;
        is_correct: boolean;
        damage_applied: boolean;
        new_health: number;
        message: string;
    }> {
        console.log(
            `[RoundService] ==================================================`,
        );
        console.log(
            `[RoundService] Processing answer from user ${userId} in battle room ${battleRoomId}`,
        );
        console.log(
            `[RoundService] Answer ID: ${answerId}, Game ID: ${gameId}, Round: ${roundNumber}`,
        );
        console.log(
            `[RoundService] ==================================================`,
        );

        // 1. Get battle room info
        const battleRoom = await battleRoomService.getBattleRoomForPlayer(
            gameId,
            userId,
            roundNumber,
        );

        if (!battleRoom) {
            return {
                success: false,
                is_correct: false,
                damage_applied: false,
                new_health: 100,
                message: "Battle room not found",
            };
        }

        // 2. Check if someone already answered
        if (
            battleRoom.first_answer_user_id &&
            battleRoom.first_answer_user_id !== userId
        ) {
            return {
                success: false,
                is_correct: false,
                damage_applied: false,
                new_health: 100,
                message: "Another player already answered in this battle room",
            };
        }

        // 3. Get answer details
        console.log(
            `[RoundService] Step 2: Fetching answer details for ${answerId.substring(
                0,
                8,
            )}...`,
        );
        const answerDetail = await gamePlayersService.getAnswerDetail(answerId);

        if (!answerDetail) {
            console.error(`[RoundService] ❌ Answer not found: ${answerId}`);
            return {
                success: false,
                is_correct: false,
                damage_applied: false,
                new_health: 100,
                message: "Answer not found",
            };
        }
        console.log(
            `[RoundService] ✅ Answer found: is_correct=${answerDetail.is_correct}`,
        );

        // 4. Record the answer
        console.log(
            `[RoundService] Step 3: Recording answer to user_answers...`,
        );
        await gamePlayersService.submitAnswer(
            userId,
            answerId,
            gameId,
            roundNumber,
        );
        console.log(`[RoundService] ✅ Answer recorded`);

        // 5. Check if this is the first answer BEFORE recording (for win tracking)
        const isFirstAnswer = !battleRoom.first_answer_user_id;
        console.log(
            `[RoundService] isFirstAnswer check: ${isFirstAnswer}, current first_answer_user_id: ${battleRoom.first_answer_user_id}`,
        );

        // 6. If this is the first answer, record it in battle room
        if (isFirstAnswer) {
            console.log(`[RoundService] Step 4: Recording first answer...`);
            await battleRoomService.recordFirstAnswer(
                battleRoomId,
                userId,
                answerId,
            );
            console.log(
                `[RoundService] ✅ First answer recorded in battle room`,
            );

            // Update user_answers to mark as first answer
            await gamePlayersService.markFirstAnswer(
                userId,
                answerId,
                roundNumber,
                battleRoomId,
            );
        }
        // 7. Get question metadata to calculate damage
        const questionData = await battleRoomService.getQuestionMeta(
            answerDetail.question_id,
        );

        if (!questionData) {
            console.error(
                `[RoundService] ❌ Question not found for question_id: ${answerDetail.question_id}`,
            );
            return {
                success: false,
                is_correct: answerDetail.is_correct,
                damage_applied: false,
                new_health: 100,
                message: "Question metadata not found",
            };
        }

        // Fetch game_room separately to get total_round
        const gameRoomData = await gameRoomService.getGameRoom(
            questionData.game_room_id,
        );

        if (!gameRoomData) {
            console.error(
                `[RoundService] ❌ Game room data not found for game_room_id: ${questionData.game_room_id}`,
            );
            return {
                success: false,
                is_correct: answerDetail.is_correct,
                damage_applied: false,
                new_health: 100,
                message: "Game room metadata not found",
            };
        }

        console.log(
            `[RoundService] Question order: ${questionData.question_order}, Total rounds: ${gameRoomData.total_round}`,
        );

        const currentOrder = questionData.question_order;
        const totalQuestions = gameRoomData.total_round || 20;

        // 7. Calculate damage
        const damage = this.calculateDamage(currentOrder, totalQuestions);

        // [BARU] Ambil buff aktif user dari DB untuk Attack (+10) / Shield (-20)
        const myBuff = await gamePlayersService.getActiveAbilityBuff(
            gameId,
            userId,
        );

        // 8. Apply damage based on correctness
        let damageApplied = false;
        let newHealth = 100;
        let isFirstAndCorrect = false;

        if (answerDetail.is_correct) {
            // Correct answer - damage to opponents in same battle room
            const opponents = [
                battleRoom.player1_id,
                battleRoom.player2_id,
                battleRoom.player3_id,
            ].filter((id): id is string => id !== null && id !== userId);

            // Jika user punya Attack buff (ability_id=2), tambah 10 kepada basenya
            const baseOffensiveDamage = damage + (myBuff === 2 ? 10 : 0);

            // [BARU] Konsumsi buff Attack jika digunakan
            if (myBuff === 2) {
                await gamePlayersService.userAttackorShieldAbility(
                    gameId,
                    userId,
                    2,
                );
                console.log(
                    `[RoundService] User ${userId.substring(
                        0,
                        8,
                    )} consumed Attack Buff`,
                );
            }

            for (const opponentId of opponents) {
                const opponent = await gamePlayersService.getParticipantsList(
                    gameId,
                );
                const opponentState = opponent.find((p) => p.id === opponentId);
                if (opponentState && opponentState.health > 0) {
                    // [BARU] Cek apakah musuh punya Shield (ability_id=4) untuk ngeblok -20
                    const opponentBuff =
                        await gamePlayersService.getActiveAbilityBuff(
                            gameId,
                            opponentId,
                        );
                    console.log(opponentBuff);
                    const finalOpponentDamage = Math.max(
                        0,
                        baseOffensiveDamage - (opponentBuff === 4 ? 20 : 0),
                    );

                    // [BARU] Konsumsi buff Shield musuh jika digunakan
                    if (opponentBuff === 4 && baseOffensiveDamage > 0) {
                        await gamePlayersService.userAttackorShieldAbility(
                            gameId,
                            opponentId,
                            4,
                        );
                        console.log(
                            `[RoundService] Opponent ${opponentId.substring(
                                0,
                                8,
                            )} consumed Shield Buff`,
                        );
                    }

                    const healthAfterDamage = Math.max(
                        0,
                        opponentState.health - finalOpponentDamage,
                    );
                    console.log(
                        `[RoundService] Applying damage to opponent ${opponentId.substring(
                            0,
                            8,
                        )}: ${
                            opponentState.health
                        } -> ${healthAfterDamage}, round=${roundNumber} (OffensiveDamage: ${baseOffensiveDamage}, OpponentBuff: ${opponentBuff})`,
                    );

                    await gamePlayersService.updateHealth(
                        opponentId,
                        gameId,
                        healthAfterDamage,
                        roundNumber,
                    );
                }
            }
            damageApplied = opponents.length > 0;

            // If first answer and correct, increment win count
            if (isFirstAnswer) {
                isFirstAndCorrect = true;
                console.log(
                    `[RoundService] User ${userId.substring(
                        0,
                        8,
                    )} answered first and correctly! Incrementing win...`,
                );

                await gamePlayersService.incrementWin(userId, gameId);
            }
        } else {
            // Wrong answer - damage to self
            const player = await gamePlayersService.getParticipantsList(gameId);
            const playerState = player.find((p) => p.id === userId);
            if (playerState) {
                // [BARU] Jika user salah jawab (damage diri sendiri), tapi dia ada shield, tetap dikurangi -20
                const selfDamage = Math.max(
                    0,
                    damage - (myBuff === 4 ? 20 : 0),
                );
                newHealth = Math.max(0, playerState.health - selfDamage);

                // [BARU] Konsumsi buff Shield diri sendiri jika digunakan
                if (myBuff === 4 && damage > 0) {
                    await gamePlayersService.userAttackorShieldAbility(
                        gameId,
                        userId,
                        4,
                    );
                    console.log(
                        `[RoundService] User ${userId.substring(
                            0,
                            8,
                        )} consumed Shield Buff for self-damage`,
                    );
                }

                console.log(
                    `[RoundService] Applying damage to self ${userId.substring(
                        0,
                        8,
                    )}: ${
                        playerState.health
                    } -> ${newHealth}, round=${roundNumber} (SelfDamage: ${selfDamage})`,
                );

                await gamePlayersService.updateHealth(
                    userId,
                    gameId,
                    newHealth,
                    roundNumber,
                );

                damageApplied = true;
            }
        }

        // 9. Mark battle room as finished
        await gameRoomService.updateBattleRoomStatus(battleRoomId, "finished");

        // 10. Check if all battle rooms are finished
        const allFinished = await battleRoomService.areAllBattlesFinished(
            gameId,
            roundNumber,
        );

        if (allFinished) {
            console.log(
                `[RoundService] All battle rooms finished for round ${roundNumber}`,
            );

            // Update match_rounds
            await battleRoomService.finalizeMatchRound(gameId, roundNumber);

            // 11. Check game end condition
            const shouldEnd = await gameRoomService.checkGameEndCondition(
                gameId,
            );
            if (shouldEnd) {
                await gameRoomService.endGame(gameId);
            } else {
                // Prepare next round
                await gameRoomService.prepareNextRound(gameId, roundNumber);
            }
        }

        return {
            success: true,
            is_correct: answerDetail.is_correct,
            damage_applied: damageApplied,
            new_health: answerDetail.is_correct ? 100 : newHealth,
            message: answerDetail.is_correct
                ? "Correct answer!"
                : "Wrong answer",
        };
    },

    /**
     * Handle timeout for a battle room (no one answered)
     */
    async handleTimeout(
        battleRoomId: string,
        gameId: string,
        roundNumber: number,
    ): Promise<void> {
        console.log(
            `[RoundService] Handling timeout for battle room ${battleRoomId}`,
        );

        // Get battle room info
        const battleRoom = await battleRoomService.getBattleRoomById(
            battleRoomId,
        );

        if (!battleRoom) {
            console.warn(
                `[RoundService] Battle room ${battleRoomId} not found during timeout handling (possibly already processed)`,
            );
            return;
        }

        // Get question metadata to calculate damage
        const questionData = await battleRoomService.getQuestionMeta(
            battleRoom.question_id,
        );

        if (!questionData) {
            console.error(
                `[RoundService] ❌ Question not found for question_id: ${battleRoom.question_id}`,
            );
            return;
        }

        // Fetch game_room separately to get total_round
        const gameRoomData = await gameRoomService.getGameRoom(
            questionData.game_room_id,
        );

        if (!gameRoomData) {
            console.error(
                `[RoundService] ❌ Game room not found for game_room_id: ${questionData.game_room_id}`,
            );
            return;
        }

        const currentOrder = questionData.question_order;
        const totalQuestions = gameRoomData.total_round || 20;

        console.log(
            `[RoundService] Timeout - Question order: ${currentOrder}, Total rounds: ${totalQuestions}`,
        );

        // Calculate damage
        const damage = this.calculateDamage(currentOrder, totalQuestions);

        // Apply damage to all players in the battle room
        const players = [
            battleRoom.player1_id,
            battleRoom.player2_id,
            battleRoom.player3_id,
        ].filter((id): id is string => id !== null);

        for (const playerId of players) {
            const player = await gamePlayersService.getParticipantsList(gameId);
            const playerState = player.find((p) => p.id === playerId);
            if (playerState && playerState.health > 0) {
                // [BARU] Seluruh player yang kena damage timeout bisa pakai shield ngeblok -20
                const playerBuff =
                    await gamePlayersService.getActiveAbilityBuff(
                        gameId,
                        playerId,
                    );
                const finalDamage = Math.max(
                    0,
                    damage - (playerBuff === 4 ? 20 : 0),
                );

                // [BARU] Konsumsi buff Shield jika digunakan saat timeout
                if (playerBuff === 4 && damage > 0) {
                    await gamePlayersService.userAttackorShieldAbility(
                        gameId,
                        playerId,
                        4,
                    );
                    console.log(
                        `[RoundService] [Timeout] Player ${playerId.substring(
                            0,
                            8,
                        )} consumed Shield Buff`,
                    );
                }

                const healthAfterDamage = Math.max(
                    0,
                    playerState.health - finalDamage,
                );
                console.log(
                    `[RoundService] [Timeout] Applying damage to ${playerId.substring(
                        0,
                        8,
                    )}: ${
                        playerState.health
                    } -> ${healthAfterDamage}, round=${roundNumber}`,
                );

                await gamePlayersService.updateHealth(
                    playerId,
                    gameId,
                    healthAfterDamage,
                    roundNumber,
                );
            }
        }

        // Mark battle room as timeout
        await gameRoomService.updateBattleRoomStatus(battleRoomId, "timeout");

        // Check if all battle rooms are finished
        const allFinished = await battleRoomService.areAllBattlesFinished(
            gameId,
            roundNumber,
        );

        if (allFinished) {
            console.log(
                `[RoundService] All battle rooms finished (with timeout) for round ${roundNumber}`,
            );

            // Update match_rounds
            await battleRoomService.finalizeMatchRound(gameId, roundNumber);

            // Check game end condition
            const shouldEnd = await gameRoomService.checkGameEndCondition(
                gameId,
            );
            if (shouldEnd) {
                await gameRoomService.endGame(gameId);
            } else {
                // Prepare next round
                await gameRoomService.prepareNextRound(gameId, roundNumber);
            }
        }

        console.log(
            `[RoundService] Timeout handled for battle room ${battleRoomId}`,
        );
    },
};
