import { NextRequest, NextResponse } from "next/server";
import { gamePlayersService } from "@/modules/gamePlayers/gamePlayers.service";

export async function POST(request: NextRequest) {
    try {
        const { roomId, userId, abilityId } = await request.json();

        if (!roomId || !userId || !abilityId) {
            return NextResponse.json(
                { error: "Missing roomId, userId, or abilityId" },
                { status: 400 },
            );
        }

        const data = await gamePlayersService.userAttackorShieldAbility(
            roomId,
            userId,
            Number(abilityId),
        );

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error(
            "API Error [POST /api/starbox/abilities/attack-shield]:",
            error,
        );
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
