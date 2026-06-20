/**
 * GET /api/game-rooms/code/[room_code]
 * http://localhost:3000/api/game-rooms/code/1AGT2025
 *
 * Fungsi:
 *   1. Mendapatkan suatu baris record dari tabel game_rooms berdasarkan rome_code
 *   2. Tujuan utamanya ketika user gabung ke suatu room game dari room_code yang dimiliki
 */

import { NextRequest, NextResponse } from "next/server";
import { gameRoomService } from "@/modules/games/game.service";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ room_code: string }> },
) {
    try {
        const { room_code } = await params;
        const data = await gameRoomService.getRoomByCode(room_code);

        if (!data) {
            return NextResponse.json(
                { error: "Room not found" },
                { status: 404 },
            );
        }

        // Return as array to maintain backward compatibility with old select("*")
        return NextResponse.json({ data: [data] });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
