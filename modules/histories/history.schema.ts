import { z } from "zod";

export const getHistoryQuerySchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
});

export interface UserGame {
    user_game_id: string;
    game_room_id: string;
    user_id: string;
    trophy_won: number;
    coins_earned: number;
    placement: number | null;
    win: number;
    lose: number;
    created_at: string;
    updated_at: string;
    count?: number;
}

export interface UserStats {
    total_match: number;
    total_rank_1: number;
    placement_ratio: number;
}

export interface GameRoom {
    game_room_id: string;
    user_id?: string;
    room_code?: string;
    category: string;
    title: string | null;
    max_player?: number;
    total_round?: number;
    difficulty?: string;
    image_url?: string;
    room_status?: string;
    room_visibility?: string;
    created_at?: string;
    updated_at?: string;
}

export type GetHistoryQueryRequest = z.infer<typeof getHistoryQuerySchema>;

/**
 * API Response dari user-game/history endpoint
 */
export interface UserGameHistory {
    game_room_id: string;
    user_id: string;
    trophy_won: number;
    coins_earned: number;
    placement: number | null;
    win: number;
    lose: number;
    created_at: string;
    updated_at: string;
    user_game_id: string;
    game_rooms?: {
        title: string;
        category: string;
    };
}

export interface HistoryItem {
    id: string;
    avatar: string;
    time: string;
    date: string;
    material: string;
    category: string;
    rank: string;
    trophy: number;
    coin: number;
    win?: number;
    lose?: number;
    baseCharacter?: string;
}

export interface PaginatedUserGameHistory {
    history: HistoryItem[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    stats: {
        totalMatches: number;
        winRate: string;
        averageRank: string;
        firstPlaces: number;
    };
}
