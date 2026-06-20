/**
 * GET /api/game-rooms/[game_room_id]
 * http://localhost:3000/api/game-rooms/c733983d-b3ad-416c-b35a-0812eca80588
 *
 * Fungsi:
 *   1. Mendapatkan suatu baris record dari tabel game_rooms berdasarkan game_room_id
 *   2. Tujuan utamanya ketika user/creator game ingin mendapatkan detail spesifik sebuah room game
 */

/**
 * PATCH /api/game-rooms/[game_room_id]
 * http://localhost:3000/api/game-rooms/c733983d-b3ad-416c-b35a-0812eca80588
 *
 * Body:
 *   {
 *     "room_status": "ongoing",
 *     "room_visibility": "private"
 *   }
 *
 * Fungsi:
 *   1. Mengupdate tabel game_rooms (rooms_status dan room_visibility) berdasarkan game_room_id
 *   2. Tujuan utamanya adalah ketika quiz/game ada di beberapa kondisi
 *      a. Creator game menekan tombol mulai maka room_status akan diupdate menjadi "open"
 *      b. Creator game menekan tombol finish maka room_status akan diupdate menjadi "ongoing"
 *      c. Creator game mengganti quiz/game yg awalnya dari private menjadi public atau sebaliknya
 */

import { NextRequest, NextResponse } from "next/server";
import { gameRoomService } from "@/modules/games/game.service";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ game_room_id: string }> },
) {
    try {
        const { game_room_id } = await params;
        const data = await gameRoomService.getRoomById(game_room_id);

        if (!data) {
            return NextResponse.json(
                { error: "Room not found" },
                { status: 404 },
            );
        }

        return NextResponse.json({ data: [data] }); // Return as array to maintain backward compatibility with old select("*")
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ game_room_id: string }> },
) {
    try {
        const body = await request.json();
        const { game_room_id } = await params;

        const updatePayload: { room_visibility?: string, room_status?: string } = {};

        if (body.room_visibility) {
            updatePayload.room_visibility = body.room_visibility;
        }

        if (body.room_status) {
            updatePayload.room_status = body.room_status;
        }

        const data = await gameRoomService.updateRoomSettings(game_room_id, updatePayload);

        return NextResponse.json({ data: [data] }); // Return as array to maintain backward compatibility
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
