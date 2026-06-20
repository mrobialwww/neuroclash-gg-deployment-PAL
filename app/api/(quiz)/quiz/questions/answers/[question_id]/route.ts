/**
 * GET /api/quiz/questions/answers/[question_id]
 * http://localhost:3000/api/quiz/questions/answers/036f6659-ba61-4ff9-b9f9-a9494d2b8d07
 *
 * Fungsi:
 *   1. Mendapatkan list (sejumlah 4) dari tabel answers berdasarkan question_id
 *   2. Tujuan utamanya ketika dalam sebuah ronde permainan memunculkan soal dan 4 opsi jawaban
 *      maka selain memanggil endpoint untuk menampilkan soal juga akan memanggil endpoint ini
 */

import { NextRequest, NextResponse } from "next/server";
import { quizService } from "@/modules/quiz/quiz.service";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ question_id: string }> },
) {
    try {
        const { question_id } = await params;

        const data = await quizService.getAnswers(question_id);

        return NextResponse.json({ data });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
