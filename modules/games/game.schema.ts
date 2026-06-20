import { z } from "zod";

/**
 * Matches the DB schema: public.game_rooms
 * This is the raw row shape returned from Supabase.
 */
export interface GameRoom {
    game_room_id: string;
    user_id: string;
    room_code: string;
    category: string;
    title: string | null;
    max_player: number;
    total_round: number;
    difficulty: "mudah" | "sedang" | "sulit";
    image_url: string;
    room_status: "open" | "playing" | "processing" | "finished";
    room_visibility: "public" | "private";
    created_at: string;
    updated_at: string;
}

export interface GameRoomWithPlayerCount extends GameRoom {
    player_count: number;
    participants_avatars?: {
        image: string;
        character: string;
    }[];
}

export interface GroupedGameRooms {
    topic: string;
    rooms: GameRoomWithPlayerCount[];
}

export const createRoomParamsSchema = z.object({
    user_id: z.string().uuid(),
    room_code: z.string(),
    category: z.string(),
    title: z.string().nullable(),
    max_player: z.number(),
    total_round: z.number(),
    difficulty: z.enum(["mudah", "sedang", "sulit"]),
    image_url: z.string(),
    room_status: z.enum(["open", "playing", "processing", "finished"]),
    room_visibility: z.enum(["public", "private"]),
});

export type CreateRoomParams = z.infer<typeof createRoomParamsSchema>;

// --- Endgame Repository Types ---

export interface GamePlayerWithUser {
    user_id: string;
    health: number;
    status: string;
    win: number;
    created_at: string;
    updated_at: string;
    users: {
        username: string;
        total_trophy: number;
    };
}

export interface UserCharacterSkin {
    user_id: string;
    characters: {
        skin_name: string;
        image_url: string;
    };
}

export interface UserAnswerCorrectness {
    user_id: string;
    round_number: number;
    created_at: string;
    answers: {
        is_correct: boolean;
    } | null;
}

export interface BattleRoomData {
    battle_room_id: string;
    game_room_id: string;
    player1_id: string;
    player2_id: string;
    status: string;
    [key: string]: unknown;
}

export interface CorrectAnswerInfo {
    answer_id: string;
    is_correct: boolean;
}

export type EndgameRoomConfig = Pick<GameRoom, "total_round" | "room_status" | "created_at" | "updated_at">;

export interface RankMaxTrophy {
    max_trophy: number;
}

export interface UserAbilityStock {
    ability_id: number;
    stock: number;
}

export interface UserStatsInfo {
    total_trophy: number;
    coin: number;
    total_match: number;
    total_rank_1: number;
    placement_ratio: number;
}

export interface EarliestRoundTime {
    created_at: string;
}

export interface EndgameResult {
    userId: string;
    username: string;
    characterImage: string;
    baseCharacter: string;
    placement: number;
    trophyWon: number;
    coinsEarned: number;
    health: number;
    isAlive: boolean;
    deathRound: number;
    answerTime: number; // For tie-breaker
    win: number;
    lose: number;
    coinBoost: number;
    trophyBoost: number;
}

export interface UserGameRecord {
    user_game_id: string;
    game_room_id: string;
    user_id: string;
    trophy_won: number;
    coins_earned: number;
    win?: number;
    lose?: number;
    created_at: string;
    updated_at: string;
}

export interface BattleRoom {
    battle_room_id: string;
    game_room_id: string;
    round_number: number;
    player1_id: string;
    player2_id: string;
    player3_id: string | null;
    question_id: string;
    first_answer_user_id: string | null;
    first_answer_id: string | null;
    status: "waiting" | "ongoing" | "finished" | "timeout";
    created_at: string;
    updated_at: string;
}

export interface PlayerWithHealth {
    user_id: string;
    health: number;
    status: string;
}
