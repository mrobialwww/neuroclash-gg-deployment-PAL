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

export interface PlayerOpponents {
    user_id: string;
    opponents: Set<string>;
}

export interface MatchRound {
    round_id: string;
    game_room_id: string;
    round_number: number;
    player1_id: string | null;
    player2_id: string | null;
    player3_id: string | null;
    winner_id: string | null;
    status: string;
}
