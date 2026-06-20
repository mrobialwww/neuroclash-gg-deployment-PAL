import { NextRequest, NextResponse } from "next/server";
import { gameRoomService } from "@/modules/games/game.service";

/**
 * Start a new round and generate battle rooms
 * POST /api/match/start-round
 * Body: { game_room_id: string, round_number: number }
 */
export async function POST(request: NextRequest) {
    const requestId = Math.random().toString(36).substring(2, 9);

    try {
        const { game_room_id, round_number } = await request.json();

        console.log(
            `[API][${requestId}] ==================================================`,
        );
        console.log(
            `[API][${requestId}] POST /api/match/start-round START - game: ${game_room_id.substring(
                0,
                8,
            )}, round: ${round_number}`,
        );
        console.log(
            `[API][${requestId}] ==================================================`,
        );

        if (!game_room_id || !round_number) {
            return NextResponse.json(
                {
                    error: "Missing required parameters: game_room_id or round_number",
                },
                { status: 400 },
            );
        }

        const result = await gameRoomService.startRoundForMatch(
            game_room_id,
            round_number,
            requestId,
        );

        if (result.reason === "ALREADY_EXISTS") {
            return NextResponse.json({
                success: true,
                battleRooms: result.battleRooms,
                message: result.message,
                fromLockWait: result.fromLockWait,
            });
        }

        if (result.reason === "LOCK_FAILED") {
            return NextResponse.json(
                {
                    error: "Cannot acquire lock for battle room generation",
                    message: result.message,
                },
                { status: 423 }, // Use 423 Locked instead of 429
            );
        }

        if (result.reason === "NOT_FOUND") {
            return NextResponse.json(
                {
                    error: result.message,
                    ...result.debug,
                },
                { status: 404 },
            );
        }

        if (!result.battleRooms || result.battleRooms.length === 0) {
            return NextResponse.json(
                {
                    error: "No battle rooms generated - game may be ending",
                    battleRooms: [],
                },
                { status: 200 },
            );
        }

        return NextResponse.json({
            success: true,
            battleRooms: result.battleRooms,
            message: result.message,
        });
    } catch (error) {
        console.error(`[API][${requestId}] Unhandled error:`, error);

        return NextResponse.json(
            {
                error: "Failed to start round",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
