import { NextResponse } from "next/server";
import { gameRoomService } from "@/modules/games/game.service";

/**
 * POST /api/game/endgame
 * Body: { "game_room_id": "uuid" }
 *
 * Centralized trigger for processing rewards for ALL players in a room.
 * This uses the admin client to bypass RLS.
 */
export async function POST(request: Request) {
    try {
        const { game_room_id } = await request.json();

        if (!game_room_id) {
            return NextResponse.json(
                { error: "Missing game_room_id" },
                { status: 400 },
            );
        }

        // Trigger atomic centralized reward processing
        await gameRoomService.processCentralizedRewards(game_room_id);

        return NextResponse.json({
            success: true,
            message: "Centralized rewards processed successfully",
        });
    } catch (error) {
        console.error("[Centralized Endgame API] Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
