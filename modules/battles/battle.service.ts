import { BattleRoom, MatchRound } from "@/modules/battles/battle.schema";
import { battleRoomRepository } from "@/modules/battles/battle.repository";

export const battleRoomService = {
    /**
     * Get all battle rooms for a specific round
     */
    async getAllBattleRoomsForRound(gameId: string, roundNumber: number): Promise<BattleRoom[]> {
        return await battleRoomRepository.getAllBattleRoomsForRound(gameId, roundNumber);
    },

    /**
     * Get battle room for a specific player in a specific round
     */
    async getBattleRoomForPlayer(
        gameId: string,
        userId: string,
        roundNumber: number
    ): Promise<BattleRoom | null> {
        console.log(`[BattleRoomService - ${userId.substring(0, 8)}] ==================================================`);
        console.log(`[BattleRoomService - ${userId.substring(0, 8)}] Fetching battle room:`);
        console.log(`[BattleRoomService - ${userId.substring(0, 8)}]   - game_room_id: ${gameId}`);
        console.log(`[BattleRoomService - ${userId.substring(0, 8)}]   - user_id: ${userId.substring(0, 8)}`);
        console.log(`[BattleRoomService - ${userId.substring(0, 8)}]   - round_number: ${roundNumber}`);
        console.log(`[BattleRoomService - ${userId.substring(0, 8)}] ==================================================`);

        // Cek semua battle rooms untuk round ini (untuk debugging) — selalu dijalankan
        let allRooms: BattleRoom[] = [];
        try {
            allRooms = await battleRoomRepository.getAllBattleRoomsForRound(gameId, roundNumber);
        } catch (allRoomsError) {
            console.error(`[BattleRoomService - ${userId.substring(0, 8)}] Error fetching all battle rooms:`, allRoomsError);
        }

        console.log(`[BattleRoomService - ${userId.substring(0, 8)}] Total battle rooms for round ${roundNumber}: ${allRooms.length}`);

        if (allRooms.length > 0) {
            allRooms.forEach((room, idx) => {
                console.log(`[BattleRoomService - ${userId.substring(0, 8)}]   Room ${idx + 1}:`, {
                    id: room.battle_room_id.substring(0, 8),
                    p1: room.player1_id.substring(0, 8),
                    p2: room.player2_id.substring(0, 8),
                    p3: room.player3_id?.substring(0, 8) || "none",
                    status: room.status,
                });
            });
        }

        // Cari battle room untuk user ini
        // Approach 1: Use .or() with proper syntax
        let data: BattleRoom | null = null;
        try {
            data = await battleRoomRepository.findBattleRoomForPlayer(gameId, roundNumber, userId);
        } catch (err) {
            console.error(`[BattleRoomService - ${userId.substring(0, 8)}] Error in OR query:`, err);
            data = null;
        }

        // Approach 2: If OR query fails, filter from already-fetched allRooms client-side
        if (!data) {
            console.warn(`[BattleRoomService - ${userId.substring(0, 8)}] OR query failed, trying fetch-all approach...`);
            data = allRooms.find((br: BattleRoom) =>
                br.player1_id === userId ||
                br.player2_id === userId ||
                br.player3_id === userId
            ) || null;
        }

        if (!data) {
            console.log(`[BattleRoomService - ${userId.substring(0, 8)}] No battle room found for user ${userId.substring(0, 8)} in round ${roundNumber}`);

            // Check if userId is in any of the battle rooms
            const userIdInRooms = allRooms.some(
                (br: BattleRoom) =>
                    br.player1_id === userId ||
                    br.player2_id === userId ||
                    br.player3_id === userId
            );
            console.log(`[BattleRoomService - ${userId.substring(0, 8)}] User ${userId.substring(0, 8)} found in any battle room: ${userIdInRooms}`);

            // Check player status before calling it a bug
            const playerStatus = await battleRoomRepository.getPlayerStatus(gameId, userId);
            const isAlive = playerStatus && playerStatus.status === "alive" && playerStatus.health > 0;

            // If user is ALIVE but NOT in any battle room, this is a BUG
            if (isAlive && !userIdInRooms && allRooms.length > 0) {
                console.error(`[BattleRoomService - ${userId.substring(0, 8)}] ❌ BUG DETECTED: User ${userId.substring(0, 8)} is ALIVE but NOT in any battle room for round ${roundNumber}!`);
                console.error(`[BattleRoomService - ${userId.substring(0, 8)}] All player IDs in round ${roundNumber}:`, allRooms.flatMap((br: BattleRoom) => [
                    br.player1_id.substring(0, 8),
                    br.player2_id.substring(0, 8),
                    br.player3_id?.substring(0, 8) || null,
                ]));
            } else if (!isAlive) {
                console.log(`[BattleRoomService - ${userId.substring(0, 8)}] User ${userId.substring(0, 8)} is eliminated. Correct behavior: no battle room assigned.`);
            }
        } else {
            console.log(`[BattleRoomService - ${userId.substring(0, 8)}] Found battle room: ${data.battle_room_id.substring(0, 8)} for user ${userId.substring(0, 8)}`);
        }

        console.log(`[BattleRoomService - ${userId.substring(0, 8)}] Result for user ${userId.substring(0, 8)}: ${data ? "Found" : "Not found"}`);
        console.log(`[BattleRoomService - ${userId.substring(0, 8)}] ==================================================`);

        return data;
    },

    /**
     * Check if a battle room is eligible for timeout processing
     */
    async checkTimeoutEligibility(
        battleRoomId: string,
        roundNumber: number
    ): Promise<{
        eligible: boolean;
        reason?: "NOT_FOUND" | "ALREADY_ANSWERED" | "ALREADY_FINISHED";
        battleRoom?: BattleRoom;
    }> {
        console.log(`[BattleRoomService] Handling timeout for battle room ${battleRoomId} in round ${roundNumber}`);

        const battleRoom = await battleRoomRepository.getBattleRoomById(battleRoomId);

        if (!battleRoom) {
            return { eligible: false, reason: "NOT_FOUND" };
        }

        // Check if anyone answered
        if (battleRoom.first_answer_user_id) {
            console.log(`[BattleRoomService] Battle room ${battleRoomId} already has an answer, skipping timeout`);
            return { eligible: false, reason: "ALREADY_ANSWERED", battleRoom };
        }

        // IDEMPOTENCY CHECK: Check if battle room is already marked as timeout/finished
        if (battleRoom.status === "timeout" || battleRoom.status === "finished") {
            console.log(`[BattleRoomService] ⚠️ Battle room ${battleRoomId} already has status ${battleRoom.status}, skipping timeout`);
            return { eligible: false, reason: "ALREADY_FINISHED", battleRoom };
        }

        console.log(`[BattleRoomService] Processing timeout for battle room ${battleRoomId} (status: ${battleRoom.status})`);

        return { eligible: true, battleRoom };
    },

    /**
     * Check if all battle rooms in a round are finished
     */
    async areAllBattlesFinished(
        gameId: string,
        roundNumber: number
    ): Promise<boolean> {
        console.log(`[BattleRoomService] Checking if all battles finished for game ${gameId}, round ${roundNumber}`);
        const battleRooms = await battleRoomRepository.getAllBattleRoomsForRound(gameId, roundNumber);

        console.log(`[BattleRoomService] Found ${battleRooms.length} battle rooms`);
        console.log(`[BattleRoomService] Battle room statuses:`, battleRooms.map((br) => ({
            id: br.battle_room_id.substring(0, 8),
            status: br.status,
        })));

        if (battleRooms.length === 0) {
            console.log("[BattleRoomService] No battle rooms found, returning true");
            return true;
        }

        const allFinished = battleRooms.every((br) => br.status === "finished" || br.status === "timeout");
        console.log(`[BattleRoomService] All battles finished: ${allFinished}`);

        return allFinished;
    },

    /**
     * Record first answer in battle room
     */
    async recordFirstAnswer(
        battleRoomId: string,
        userId: string,
        answerId: string
    ): Promise<void> {
        await battleRoomRepository.updateFirstAnswer(battleRoomId, userId, answerId);
    },

    /**
     * Delete all battle rooms for a game
     */
    async deleteBattleRooms(gameId: string): Promise<void> {
        await battleRoomRepository.deleteAllBattleRooms(gameId);
    },

    /**
     * Ambil pairing ronde untuk user tertentu dari tabel match_rounds
     */
    async getRoomForPlayer(
        roomId: string,
        userId: string,
        roundNumber: number
    ): Promise<MatchRound | null> {
        console.log(`[BattleRoomService] Getting match round for player ${userId.substring(0, 8)} in round ${roundNumber}`);
        return await battleRoomRepository.getRoomForPlayer(roomId, userId, roundNumber);
    },

    /**
     * Aktifkan ronde di tabel match_rounds
     */
    async activateRound(roomId: string, roundNumber: number): Promise<MatchRound | null> {
        console.log(`[BattleRoomService] Activating match round ${roundNumber} for room ${roomId.substring(0, 8)}`);
        return await battleRoomRepository.activateRound(roomId, roundNumber);
    },

    /**
     * Finalisasi ronde di tabel match_rounds
     */
    async finalizeRound(
        roomId: string,
        roundNumber: number,
        winnerId: string | null
    ): Promise<MatchRound | null> {
        console.log(`[BattleRoomService] Finalizing match round ${roundNumber} with winner ${winnerId ? winnerId.substring(0, 8) : 'none'}`);
        return await battleRoomRepository.finalizeRound(roomId, roundNumber, winnerId);
    },

    /**
     * Finalize match round (mark as completed)
     */
    async finalizeMatchRound(gameId: string, roundNumber: number) {
        return await battleRoomRepository.finalizeMatchRound(gameId, roundNumber);
    },

    /**
     * Get question meta (difficulty level, order, etc)
     */
    async getQuestionMeta(questionId: string) {
        return await battleRoomRepository.getQuestionMeta(questionId);
    },

    /**
     * Get battle room by specific ID
     */
    async getBattleRoomById(battleRoomId: string) {
        return await battleRoomRepository.getBattleRoomById(battleRoomId);
    },
};
