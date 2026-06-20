/**
 * POST /api/battle/submit-answer
 *
 * Body:
 *   {
 *     "user_id": "uuid",
 *     "answer_id": "uuid",
 *     "battle_room_id": "uuid",
 *     "game_room_id": "uuid",
 *     "round_number": number
 *   }
 *
 * Fungsi:
 *   1. Proses jawaban user dalam konteks battle room
 *   2. Cek apakah yang menjawab pertama
 *   3. Terapkan damage berdasarkan kebenaran jawaban
 *   4. Cek apakah semua battle room selesai
 *   5. Jika semua selesai, terapkan damage semua dan cek kondisi akhir permainan
 */

import { roundManagementService } from "@/services/roundManagementService";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        console.log(
            "[BattleAnswer] ==================================================",
        );
        console.log("[BattleAnswer] POST /api/battle/submit-answer START");
        console.log(
            "[BattleAnswer] ==================================================",
        );

        const {
            user_id,
            answer_id,
            battle_room_id,
            game_room_id,
            round_number,
        } = await request.json();

        console.log(`[BattleAnswer] user_id: ${user_id}`);
        console.log(`[BattleAnswer] answer_id: ${answer_id}`);
        console.log(`[BattleAnswer] battle_room_id: ${battle_room_id}`);
        console.log(`[BattleAnswer] game_room_id: ${game_room_id}`);
        console.log(`[BattleAnswer] round_number: ${round_number}`);

        if (
            !user_id ||
            !answer_id ||
            !battle_room_id ||
            !game_room_id ||
            !round_number
        ) {
            return NextResponse.json(
                {
                    error: "Missing required fields: user_id, answer_id, battle_room_id, game_room_id, round_number",
                },
                { status: 400 },
            );
        }

        console.log(`[BattleAnswer] Calling processAnswer...`);

        const result = await roundManagementService.processAnswer(
            user_id,
            answer_id,
            battle_room_id,
            game_room_id,
            round_number,
        );

        console.log(`[BattleAnswer] Result:`, result);
        console.log(
            "[BattleAnswer] ==================================================",
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error(
            "[BattleAnswer] ==================================================",
        );
        console.error("[BattleAnswer] ❌ FINAL ERROR:");
        console.error(
            "[BattleAnswer] ==================================================",
        );
        console.error("[BattleAnswer] Error:", error);
        console.error(
            "[BattleAnswer] Error message:",
            error instanceof Error ? error.message : String(error),
        );
        console.error(
            "[BattleAnswer] Error name:",
            error instanceof Error ? error.name : "Unknown",
        );
        console.error(
            "[BattleAnswer] Error code:",
            (error as any)?.code || "No code",
        );
        if (error instanceof Error && error.stack) {
            console.error("[BattleAnswer] Stack trace:");
            console.error(error.stack);
        }
        console.error(
            "[BattleAnswer] ==================================================",
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal Server Error",
                debug: {
                    name: error instanceof Error ? error.name : "Unknown",
                    code: (error as any)?.code || "No code",
                },
            },
            { status: 500 },
        );
    }
}
