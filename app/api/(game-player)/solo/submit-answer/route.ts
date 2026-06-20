/**
 * POST /api/solo/submit-answer
 *
 * Body:
 *   {
 *     "user_id": "uuid",
 *     "answer_id": "uuid",
 *     "game_room_id": "uuid",
 *     "round_number": number
 *   }
 *
 * Fungsi:
 *   1. Record jawaban user ke tabel user_answers
 *   2. Kembalikan apakah jawaban benar atau salah
 */

import { NextRequest, NextResponse } from "next/server";
import { gamePlayersService } from "@/modules/gamePlayers/gamePlayers.service";

export async function POST(request: NextRequest) {
    try {
        const { user_id, answer_id, game_room_id, round_number } =
            await request.json();

        if (!user_id || !answer_id || !game_room_id || !round_number) {
            return NextResponse.json(
                {
                    error: "Missing required fields: user_id, answer_id, game_room_id, round_number",
                },
                { status: 400 },
            );
        }

        const answerDetail = await gamePlayersService.submitSoloAnswer(
            user_id,
            answer_id,
            game_room_id,
            round_number,
        );

        return NextResponse.json({
            success: true,
            is_correct: answerDetail.is_correct,
        });
    } catch (error) {
        console.error("[SoloAnswer] Unhandled error:", error);
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
