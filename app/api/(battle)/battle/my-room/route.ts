/**
 * GET /api/battle/my-room?game_room_id=xxx&user_id=xxx&round_number=x
 *
 * Query params:
 *   - game_room_id: string
 *   - user_id: string
 *   - round_number: number
 *
 * Returns: BattleRoom | null
 */

import { NextRequest, NextResponse } from "next/server";
import { battleRoomService } from "@/modules/battles/battle.service";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const gameRoomId = searchParams.get("game_room_id");
    const userId = searchParams.get("user_id");
    const roundNumber = searchParams.get("round_number");

    if (!gameRoomId || !userId || !roundNumber) {
        return NextResponse.json(
            {
                error: "Missing required params: game_room_id, user_id, round_number",
            },
            { status: 400 },
        );
    }

    try {
        const data = await battleRoomService.getBattleRoomForPlayer(
            gameRoomId,
            userId,
            parseInt(roundNumber)
        );

        return NextResponse.json(data);
    } catch (error) {
        console.error("[BattleMyRoom] API Error:", error);
        return NextResponse.json(null, { status: 500 });
    }
}
