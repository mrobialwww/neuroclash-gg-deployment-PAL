import { NextResponse } from "next/server";
import { gameRoomService } from "@/modules/games/game.service";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ game_room_id: string }> },
) {
    try {
        const { game_room_id } = await params;

        if (!game_room_id) {
            return NextResponse.json(
                { error: "id not found" },
                { status: 400 },
            );
        }

        // 1. Initial status check
        const roomStatus = await gameRoomService.getRoomStatus(game_room_id);

        // 2. Safety Trigger: If still 'ongoing' or 'processing' (crashed mid-reward),
        // it means rewards haven't been fully persisted yet.
        // This ensures that the first player viewing the endgame page triggers the persistence.
        if (
            roomStatus &&
            (roomStatus === "ongoing" ||
                roomStatus === "processing" ||
                roomStatus === "playing")
        ) {
            console.log(
                `[Endgame API] Safety trigger activated for room ${game_room_id} (status: ${roomStatus}). Processing rewards...`,
            );
            await gameRoomService.processCentralizedRewards(game_room_id);
        }

        const results = await gameRoomService.calculateMatchResults(game_room_id);

        return NextResponse.json({
            success: true,
            data: results,
        });
    } catch (error) {
        console.error("[Endgame API] Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
