import { NextRequest, NextResponse } from "next/server";
import { gamePlayersService } from "@/modules/gamePlayers/gamePlayers.service";

export async function POST(request: NextRequest) {
    try {
        const { roomId, assignments } = await request.json();

        if (!roomId || !assignments || !Array.isArray(assignments)) {
            return NextResponse.json(
                { error: "Invalid request payload" },
                { status: 400 },
            );
        }

        const result = await gamePlayersService.autoAssignAbilities(roomId, assignments);

        if (!result.success) {
            // We still return 200 to not break the UI completely, but with partial success
            return NextResponse.json(result);
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("[API] Auto-assign error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 },
        );
    }
}
