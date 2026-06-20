import { NextRequest, NextResponse } from "next/server";
import { gameRoomService } from "@/modules/games/game.service";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ game_room_id: string }> },
) {
    try {
        const { game_room_id } = await params;
        const { new_host_id } = await request.json();

        if (!new_host_id) {
            return NextResponse.json(
                { error: "New host ID required" },
                { status: 400 },
            );
        }

        const data = await gameRoomService.migrateRoomHost(game_room_id, new_host_id);

        return NextResponse.json({ data });
    } catch (error) {
        console.error("API Error [PATCH /migrate]:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
