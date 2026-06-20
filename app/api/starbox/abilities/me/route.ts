import { NextRequest, NextResponse } from "next/server";
import { gamePlayersService } from "@/modules/gamePlayers/gamePlayers.service";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const gameRoomId = searchParams.get("roomId");
        const userId = searchParams.get("userId");

        if (!gameRoomId || !userId) {
            return NextResponse.json(
                { error: "Missing roomId or userId in query params" },
                { status: 400 },
            );
        }

        const data = await gamePlayersService.getMyAbilities(
            gameRoomId,
            userId,
        );

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("API Error [GET /api/starbox/abilities/me]:", error);
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
