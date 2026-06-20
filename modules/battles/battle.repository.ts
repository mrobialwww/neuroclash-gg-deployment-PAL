import { createClient } from "@/lib/supabase/server";
import { getWIBNow } from "@/lib/utils/dateUtils";
import {
    BattleRoom,
    PlayerWithHealth,
    MatchRound,
} from "@/modules/battles/battle.schema";

export const battleRoomRepository = {
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
     * Get a single battle room by its ID
     */
    async getBattleRoomById(battleRoomId: string): Promise<BattleRoom | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("battle_rooms")
            .select("*")
            .eq("battle_room_id", battleRoomId)
            .maybeSingle();

        if (error) {
            throw new Error(
                `[BattleRoomRepo] getBattleRoomById Error: ${error.message}`,
            );
        }
        return data as BattleRoom | null;
    },

    /**
     * Get question order and game room id
     */
    async getQuestionMeta(
        questionId: string,
    ): Promise<{ question_order: number; game_room_id: string } | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("questions")
            .select("question_order, game_room_id")
            .eq("question_id", questionId)
            .maybeSingle();

        if (error) {
            throw new Error(
                `[BattleRoomRepo] getQuestionMeta Error: ${error.message}`,
            );
        }
        return data as { question_order: number; game_room_id: string } | null;
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
     * Find a specific battle room for a player using OR query
     */
    async findBattleRoomForPlayer(
        gameId: string,
        roundNumber: number,
        userId: string,
    ): Promise<BattleRoom | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("battle_rooms")
            .select("*")
            .eq("game_room_id", gameId)
            .eq("round_number", roundNumber)
            .or(
                `player1_id.eq.${userId},player2_id.eq.${userId},player3_id.eq.${userId}`,
            )
            .maybeSingle();

        if (error) {
            console.error(
                "[BattleRoomRepo] Error finding battle room for player:",
                error,
            );
            throw new Error(error.message);
        }
        return data as BattleRoom | null;
    },

    /**
     * Get the status and health of a specific player
     */
    async getPlayerStatus(
        gameId: string,
        userId: string,
    ): Promise<{ status: string; health: number } | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("game_players")
            .select("status, health")
            .eq("game_room_id", gameId)
            .eq("user_id", userId)
            .single();

        if (error) {
            console.error(
                "[BattleRoomRepo] Error fetching player status:",
                error,
            );
            throw new Error(error.message);
        }
        return data;
    },

    /**
     * Record the first answer in a battle room
     */
    async updateFirstAnswer(
        battleRoomId: string,
        userId: string,
        answerId: string,
    ): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from("battle_rooms")
            .update({
                first_answer_user_id: userId,
                first_answer_id: answerId,
                updated_at: getWIBNow(),
            })
            .eq("battle_room_id", battleRoomId);

        if (error) {
            console.error(
                "[BattleRoomRepo] Error recording first answer:",
                error,
            );
            throw new Error(error.message);
        }
    },

    /**
     * Delete all battle rooms for a game
     */
    async deleteAllBattleRooms(gameId: string): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from("battle_rooms")
            .delete()
            .eq("game_room_id", gameId);

        if (error) {
            console.error(
                "[BattleRoomRepo] Error deleting all battle rooms:",
                error,
            );
            throw new Error(error.message);
        }
    },

    /**
     * Ambil pairing ronde untuk user tertentu dari tabel match_rounds
     */
    async getRoomForPlayer(
        roomId: string,
        userId: string,
        roundNumber: number,
    ): Promise<MatchRound | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("match_rounds")
            .select("*")
            .eq("game_room_id", roomId)
            .eq("round_number", roundNumber)
            .or(
                `player1_id.eq.${userId},player2_id.eq.${userId},player3_id.eq.${userId}`,
            )
            .single();

        if (error) {
            console.error("[BattleRoomRepo] getRoomForPlayer error:", error);
            throw new Error(error.message);
        }
        return data as MatchRound | null;
    },

    /**
     * Aktifkan ronde di tabel match_rounds
     */
    async activateRound(
        roomId: string,
        roundNumber: number,
    ): Promise<MatchRound | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("match_rounds")
            .update({ status: "ongoing", updated_at: getWIBNow() })
            .eq("game_room_id", roomId)
            .eq("round_number", roundNumber)
            .select()
            .maybeSingle();

        if (error) {
            console.error("[BattleRoomRepo] activateRound error:", error);
            throw new Error(error.message);
        }
        return data as MatchRound | null;
    },

    /**
     * Finalisasi ronde di tabel match_rounds
     */
    async finalizeRound(
        roomId: string,
        roundNumber: number,
        winnerId: string | null,
    ): Promise<MatchRound | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("match_rounds")
            .update({
                status: "finished",
                winner_id: winnerId,
                updated_at: getWIBNow(),
            })
            .eq("game_room_id", roomId)
            .eq("round_number", roundNumber)
            .select()
            .maybeSingle();

        if (error) {
            console.error("[BattleRoomRepo] finalizeRound error:", error);
            throw new Error(error.message);
        }
        return data as MatchRound | null;
    },

    /**
     * Finalize a match round — mark as finished after all battles are done.
     * Called from processAnswer and handleTimeout when allFinished = true.
     */
    async finalizeMatchRound(
        gameId: string,
        roundNumber: number,
    ): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from("match_rounds")
            .update({
                all_battles_finished: true,
                damage_applied: true,
                status: "finished",
                updated_at: getWIBNow(),
            })
            .eq("game_room_id", gameId)
            .eq("round_number", roundNumber);

        if (error) {
            throw new Error(
                `[BattleRoomRepo] finalizeMatchRound Error: ${error.message}`,
            );
        }
    },
};
