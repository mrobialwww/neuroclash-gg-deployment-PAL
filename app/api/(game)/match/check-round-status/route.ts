import { NextRequest, NextResponse } from "next/server";
import { battleRoomService } from "@/modules/battles/battle.service";
import { gameRoomService } from "@/modules/games/game.service";

/**
 * Check if all battle rooms are finished before advancing round
 * GET /api/match/check-round-status
 * Query params: game_room_id, round_number
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const game_room_id = searchParams.get("game_room_id");
        const round_number = parseInt(searchParams.get("round_number") || "0");

        if (!game_room_id || !round_number) {
            return NextResponse.json(
                {
                    error: "Missing required parameters: game_room_id or round_number",
                },
                { status: 400 },
            );
        }

        console.log(
            `[API] Checking round status for game ${game_room_id}, round ${round_number}`,
        );

        const allFinished = await battleRoomService.areAllBattlesFinished(
            game_room_id,
            round_number,
        );

        // Check game end condition (only 1 player alive or all rounds completed)
        const shouldEndGame = await gameRoomService.checkGameEndCondition(
            game_room_id,
        );

        return NextResponse.json({
            all_finished: allFinished,
            game_ended: shouldEndGame,
            game_room_id,
            round_number,
        });
    } catch (error) {
        console.error("[API] Error checking round status:", error);
        return NextResponse.json(
            {
                error: "Failed to check round status",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
