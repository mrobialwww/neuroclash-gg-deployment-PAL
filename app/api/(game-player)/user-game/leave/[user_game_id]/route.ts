// DELETE /api/user-game/leave/[user_game_id]
// - dilakukan ketika user keluar dari lobby atau selesai quiz
// - menghapus record user_games berdasarkan user_game_id

import { NextRequest, NextResponse } from "next/server";
import { gamePlayersService } from "@/modules/gamePlayers/gamePlayers.service";

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ user_game_id: string }> },
) {
    try {
        const { user_game_id } = await params;

        await gamePlayersService.leaveLobby(user_game_id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("API Error:", error);
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
