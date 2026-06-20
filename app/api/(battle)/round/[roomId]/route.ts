/**
 * GET /api/match/round/[roomId]
 *
 * Query Params:
 *   - round_number: number
 *   - user_id: string
 *
 * Fungsi:
 *   Mengambil pairing ronde aktif beserta data lawan
 *   Dipakai useMatchStore saat ronde baru dimulai untuk tahu siapa yang dihadapi
 */

import { battleRoomService } from "@/modules/battles/battle.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ roomId: string }> },
) {
    try {
        const { roomId } = await params;
        const searchParams = request.nextUrl.searchParams;
        const roundNumber = parseInt(searchParams.get("round_number") || "1");
        const userId = searchParams.get("user_id");

        if (!userId) {
            return NextResponse.json(
                { error: "Missing user_id" },
                { status: 400 },
            );
        }

        const roundData = await battleRoomService.getRoomForPlayer(
            roomId,
            userId,
            roundNumber,
        );

        if (!roundData) {
            return NextResponse.json(
                { error: "Round not found for this user" },
                { status: 404 },
            );
        }

        return NextResponse.json({
            success: true,
            round: roundData,
        });
    } catch (error) {
        console.error("API Error [GET /api/match/round]:", error);
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
