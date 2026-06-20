import { NextRequest, NextResponse } from "next/server";
import { gamePlayersService } from "@/modules/gamePlayers/gamePlayers.service";

export async function POST(request: NextRequest) {
    try {
        const { gameRoomId, totalPlayer, shouldResetDb } = await request.json();

        if (!gameRoomId || totalPlayer === undefined) {
            return NextResponse.json(
                { error: "Missing gameRoomId or totalPlayer" },
                { status: 400 },
            );
        }

        const data = await gamePlayersService.initialAbilites(
            gameRoomId,
            totalPlayer,
            shouldResetDb,
        );

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("API Error [POST /api/starbox/abilities/init]:", error);
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
