import { z } from "zod";

export interface Question {
    question_id: string;
    game_room_id: string;
    question_order: number;
    question_text: string;
    created_at: string;
    updated_at: string;
}

export interface Answer {
    answer_id: string;
    question_id: string;
    answer_text: string;
    is_correct: boolean;
    key: string;
}

export interface UserAnswer {
    user_answer_id: string;
    user_id: string;
    answer_id: string;
    created_at: string;
}

export interface PlayerMatchState {
    id: string;
    name: string;
    image: string;
    character: string;
    health: number;
    is_alive: boolean;
    score: number;
}

export interface RoomParticipant {
    user_id: string;
    username?: string;
    character_image?: string;
    [key: string]: unknown;
}

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
    room_status: "open" | "playing" | "finished";
    room_visibility: "public" | "private";
    created_at: string;
    updated_at: string;
}

export const quizOptionSchema = z.object({
    id: z.string().uuid(),
    label: z.string(),
    text: z.string(),
    isCorrect: z.boolean(),
});

export const quizQuestionSchema = z.object({
    question_id: z.string().uuid(),
    question_text: z.string(),
    question_order: z.number(),
    options: z.array(quizOptionSchema),
});

export type QuizOption = z.infer<typeof quizOptionSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
