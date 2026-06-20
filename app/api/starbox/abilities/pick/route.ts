import { NextRequest, NextResponse } from "next/server";
import { gamePlayersService } from "@/modules/gamePlayers/gamePlayers.service";

export async function POST(request: NextRequest) {
    try {
        const { roomId, abilityId, userId } = await request.json();

        if (!roomId || !abilityId || !userId) {
            return NextResponse.json(
                { error: "Missing roomId, abilityId, or userId" },
                { status: 400 },
            );
        }

        const data = await gamePlayersService.insertPlayerAbility(
            roomId,
            String(abilityId),
            userId,
        );

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("API Error [POST /api/starbox/abilities/pick]:", error);
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
