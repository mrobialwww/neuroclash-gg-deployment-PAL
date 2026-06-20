export interface PlayerMatchState {
    id: string;
    name: string;
    image: string;
    character: string;
    health: number; // Default 100
    is_alive: boolean;
    score: number;
}

export interface ParticipantRecord {
    user_game_id: string;
    game_room_id: string;
    user_id: string;
    trophy_won: number;
    coins_earned: number;
    created_at: string;
    updated_at: string;
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

export interface LobbyPlayer {
    isHost?: boolean;
    userGameId?: string;
    joinedAt?: string;
    health: number;
    maxHealth: number;
    isMe?: boolean;
    id: string;
    name: string;
    character: string;
    image: string;
}

export interface LobbyInitResult {
    userGameId: string;
    currentUserId: string;
}

export interface PlayerOpponents {
    user_id: string;
    opponents: Set<string>;
}