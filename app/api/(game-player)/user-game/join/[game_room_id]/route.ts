/**
 * POST /api/user-game/join/[game_room_id]
 */

// TIDAK DIGUNAKAN
import { NextRequest, NextResponse } from "next/server";
import { gamePlayersService } from "@/modules/gamePlayers/gamePlayers.service";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ game_room_id: string }> },
) {
    try {
        const { game_room_id } = await params;

        let requestBody;
        try {
            requestBody = await request.json();
        } catch (e) {
            return NextResponse.json(
                { error: "Invalid JSON" },
                { status: 400 },
            );
        }

        const { user_id } = requestBody;

        if (!user_id) {
            return NextResponse.json(
                { error: "Missing user_id" },
                { status: 400 },
            );
        }

        const data = await gamePlayersService.joinGameRoom(
            game_room_id,
            user_id,
        );

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("\n[JOIN] ❌ FINAL ERROR:", error);

        if (error.status) {
            return NextResponse.json(
                {
                    error: error.message,
                    debug: error.debug,
                    user_game_id: error.user_game_id,
                },
                { status: error.status },
            );
        }

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal Server Error",
                debug: {
                    stack: error instanceof Error ? error.stack : undefined,
                },
            },
            { status: 500 },
        );
    }
}
