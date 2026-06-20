// GET /api/user-game/participants/[game_room_id]
// - pembuat game ingin melihat siapa saja partisipan dari game yang dibuatnya dengan menggunakan game_room_id

import { NextResponse } from "next/server";
import { gamePlayersService } from "@/modules/gamePlayers/gamePlayers.service";

export async function GET({
    params,
}: {
    params: Promise<{ game_room_id: string }>;
}) {
    try {
        const { game_room_id } = await params;

        const data = await gamePlayersService.getRawParticipants(game_room_id);

        return NextResponse.json({ data });
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
