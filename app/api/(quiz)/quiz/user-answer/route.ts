/**
 * POST /api/quiz/user-answer
 * http://localhost:3000/api/quiz/user-answer
 *
 * Body:
 *   {
 *     "user_id": "c307f9dc-482f-4442-b566-97dbc258c0e8",
 *     "answer_id": "0014b57b-8912-40ce-962c-29e5836fcf07",
 *     "round_number": 1
 *   }
 *
 * Fungsi:
 *   1. Menambahkan data baris record baru ke tabel user_answers
 *   2. Tujuan utamanya ketika user tiap selesai menjawab soal di suatu ronde dalam quiz/game
 */

// TIDAK DIGUNAKAN
import { gamePlayersService } from "@/modules/gamePlayers/gamePlayers.service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { user_id, answer_id, round_number } = await request.json();

        if (!user_id || !answer_id || !round_number) {
            return NextResponse.json(
                { error: "Missing user_id, answer_id, or round_number" },
                { status: 400 },
            );
        }

        const result = await gamePlayersService.processAnswerSubmission(
            user_id,
            answer_id,
            round_number,
        );

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error("API Error [POST /api/quiz/user-answer]:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal Server Error",
            },
            { status: 500 },
        );
    }
}
