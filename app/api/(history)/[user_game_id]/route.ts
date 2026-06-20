/**
 * GET /api/user-game/[user_game_id]
 * http://localhost:3000/api/user-game/48647dcc-b3ab-4830-a28a-a171eebb13ce
 *
 * Fungsi:
 *   1. Mendapatkan suatu baris record dari tabel user_game berdasarkan user_game_id dan list dari
 *      tabel questions dan answer
 *   2. Tujuan utamanya ketika user ingin melihat detail riwayat suatu game/quiz yg pernah diikuti
 *   3. Return nya berisi statistik akhir dari sebuah quiz/game, Menampilkan riwayat soal beserta hasil
 *      jawabannya untuk setiap soal dalam game
 */

// TIDAK DIGUNAKAN
import { NextRequest, NextResponse } from "next/server";
import { historyService } from "@/modules/histories/history.service";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ user_game_id: string }> },
) {
    try {
        const { user_game_id } = await params;

        const result = await historyService.getGameDetail(user_game_id);

        return NextResponse.json(result);
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
