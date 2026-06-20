import { NextRequest, NextResponse } from "next/server";
import { roundManagementService } from "@/services/roundManagementService";
import { battleRoomService } from "@/modules/battles/battle.service";

/**
 * Handle timeout for a battle room (no one answered)
 * POST /api/battle/timeout
 * Body: { game_room_id: string, round_number: number, battle_room_id: string }
 */
export async function POST(request: NextRequest) {
    try {
        const { game_room_id, round_number, battle_room_id } =
            await request.json();

        if (!game_room_id || !round_number || !battle_room_id) {
            return NextResponse.json(
                {
                    error: "Missing required parameters: game_room_id, round_number, or battle_room_id",
                },
                { status: 400 },
            );
        }

        const eligibility = await battleRoomService.checkTimeoutEligibility(battle_room_id, round_number);

        if (!eligibility.eligible) {
            if (eligibility.reason === "NOT_FOUND") {
                return NextResponse.json({ error: "Battle room not found" }, { status: 404 });
            }
            if (eligibility.reason === "ALREADY_ANSWERED") {
                return NextResponse.json({ success: true, message: "Battle room already has an answer" });
            }
            if (eligibility.reason === "ALREADY_FINISHED") {
                return NextResponse.json({ success: true, message: `Battle room already ${eligibility.battleRoom?.status}` });
            }
        }

        // Call timeout handler to apply damage
        await roundManagementService.handleTimeout(
            battle_room_id,
            game_room_id,
            round_number,
        );

        return NextResponse.json({
            success: true,
            message: "Timeout damage applied to all players in battle room",
        });
    } catch (error) {
        console.error("[API] Error handling timeout:", error);
        return NextResponse.json(
            {
                error: "Failed to handle timeout",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
