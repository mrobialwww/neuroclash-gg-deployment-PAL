import { NextRequest, NextResponse } from "next/server";
import { quizService } from "@/modules/quiz/quiz.service";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ game_room_id: string }> },
) {
    try {
        const { game_room_id } = await params;

        // Panggil quizService untuk orkestrasi ambil room + participants
        const lobbyData = await quizService.getLobbyData(game_room_id);

        if (!lobbyData) {
            return NextResponse.json(
                { error: "Room tidak ditemukan" },
                { status: 404 },
            );
        }

        return NextResponse.json({
            success: true,
            data: lobbyData,
        });
    } catch (error) {
        console.error("API Error [GET /api/game-rooms/lobby]:", error);
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
