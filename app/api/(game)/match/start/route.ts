/**
 * POST /api/match/start
 *
 * Body:
 *   {
 *     "game_room_id": "uuid"
 *   }
 *
 * Fungsi:
 *   1. Ambil semua pemain yang sudah join room
 *   2. Insert ke game_players dengan health 100
 *   3. Generate battle rooms untuk round 1 dan simpan ke battle_rooms
 *   4. Update game_rooms.room_status jadi 'playing'
 *   5. Return battle room untuk user saat ini
 */

import { gameRoomService } from "@/modules/games/game.service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    console.log("[API] POST /api/match/start START");
    try {
        console.log("[API] Step 0: Reading request body");
        let requestBody;

        try {
            requestBody = await request.json();
            console.log("[API] Request body:", requestBody);
        } catch (jsonError) {
            console.error("[API] Error reading request.json():", jsonError);
            return NextResponse.json(
                { error: "Invalid JSON in request body" },
                { status: 400 },
            );
        }

        const { game_room_id } = requestBody;

        console.log(`[API] game_room_id: ${game_room_id}`);

        if (!game_room_id) {
            return NextResponse.json(
                { error: "Missing game_room_id" },
                { status: 400 },
            );
        }

        const result = await gameRoomService.startMatch(game_room_id);

        return NextResponse.json({
            success: true,
            total_players: result.total_players,
            first_battle_room: result.first_battle_room,
        });
    } catch (error) {
        console.error("[API] FINAL ERROR:");
        console.error("[API] Error:", error);
        console.error(
            "[API] Error message:",
            error instanceof Error ? error.message : String(error),
        );
        console.error(
            "[API] Error stack:",
            error instanceof Error ? error.stack : "No stack",
        );
        console.error(
            "[API] Error name:",
            error instanceof Error ? error.name : "Unknown",
        );
        console.error(
            "[API] Error code:",
            (error as unknown as { code?: string })?.code || "No code",
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal Server Error",
                details: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 },
        );
    }
}
