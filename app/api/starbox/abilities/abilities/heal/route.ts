import { NextRequest, NextResponse } from "next/server";
import { gamePlayersService } from "@/modules/gamePlayers/gamePlayers.service";

export async function POST(request: NextRequest) {
    try {
        const { roomId, userId } = await request.json();

        if (!roomId || !userId) {
            return NextResponse.json(
                { error: "Missing roomId or userId" },
                { status: 400 },
            );
        }

        const data = await gamePlayersService.userHealAbility(roomId, userId);

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("API Error [POST /api/starbox/abilities/heal]:", error);
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
