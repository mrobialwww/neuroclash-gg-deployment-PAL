import {
    Answer,
    Question,
    RoomParticipant,
    GameRoom,
} from "@/modules/quiz/quiz.schema";
import { createClient } from "@/lib/supabase/server";

// Fetch question by game_room_id + order
export const quizRepository = {
    /**
     * Get the public URL for a PDF material from Supabase Storage
     */
    async getPDFPublicUrl(
        category: string,
        difficulty: string,
    ): Promise<string | null> {
        const supabase = await createClient();
        const {
            data: { publicUrl },
        } = supabase.storage
            .from("materials")
            .getPublicUrl(`${category}/${difficulty}.pdf`);
        return publicUrl || null;
    },

    /**
     * GET /api/quiz/questions/[game_room_id]?question_order=[order]
     * Returns the question row for a given room and round order.
     */
    async getQuestion(
        gameRoomId: string,
        order: number,
    ): Promise<Question | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("questions")
            .select("*")
            .eq("game_room_id", gameRoomId)
            .eq("question_order", order)
            .maybeSingle();

        if (error) {
            console.error("[QuizRepo] getQuestion Error:", error);
            throw new Error(error.message);
        }

        return data as Question | null;
    },

    /**
     * GET /api/quiz/questions/answers/[question_id]
     * Returns the 4 answer options for a given question.
     */
    async getAnswers(questionId: string): Promise<Answer[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("answers")
            .select("*")
            .eq("question_id", questionId);

        if (error) {
            console.error("[QuizRepo] getAnswers Error:", error);
            throw new Error(error.message);
        }

        return (data as Answer[]) ?? [];
    },
};
