/**
 * GET /api/quiz/questions/[game_room_id]?question_order=[order]
 * http://localhost:3000/api/quiz/questions/c733983d-b3ad-416c-b35a-0812eca80588?question_order=10
 *
 * Fungsi:
 *   1. Mendapatkan suatu baris record dari tabel questions berdasarkan game_room_id dan order
 *      (urutan ke-n dari soal)
 *   2. Tujuan utamanya ketika suatu quiz/game akan memunculkan soal, maka tiap ronde sejumlah n
 *      akan memanggil endpoint tersebut
 */

import { NextRequest, NextResponse } from "next/server";
import { quizService } from "@/modules/quiz/quiz.service";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ game_room_id: string }> },
) {
    try {
        const { game_room_id } = await params;
        const { searchParams } = new URL(request.url);

        const order = searchParams.get("question_order");

        const data = await quizService.getQuestion(game_room_id, Number(order));

        return NextResponse.json({ data });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
