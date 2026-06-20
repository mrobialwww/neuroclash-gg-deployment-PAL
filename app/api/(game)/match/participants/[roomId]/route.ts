/**
 * GET /api/match/participants/[roomId]
 *
 * Fungsi:
 *   Mengambil semua pemain dari game_players untuk real-time sync
 *   Dipakai oleh useMatchStore.syncPlayersFromDB
 */

import { gamePlayersService } from "@/modules/gamePlayers/gamePlayers.service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET({ params }: { params: Promise<{ roomId: string }> }) {
    try {
        const { roomId } = await params;

        const participants = await gamePlayersService.getParticipantsList(
            roomId,
        );

        console.log(`[API] ==================================================`);
        console.log(`[API] Returning response to client`);
        console.log(`[API] ==================================================`);

        return NextResponse.json({
            success: true,
            data: participants,
        });
    } catch (error) {
        console.error(
            "[API] FINAL ERROR in GET /api/match/participants]:",
            error,
        );
        console.error(
            "[API] Error message:",
            error instanceof Error ? error.message : String(error),
        );
        console.error(
            "[API] Error stack:",
            error instanceof Error ? error.stack : "No stack",
        );
        console.error("[API] Error code:", (error as any)?.code || "No code");

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
