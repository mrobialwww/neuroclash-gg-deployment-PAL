import { NextRequest, NextResponse } from "next/server";
import { quizService } from "@/modules/quiz/quiz.service";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ game_room_id: string }> },
) {
    try {
        const { game_room_id: gameRoomId } = await params;

        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json(
                { error: "Invalid JSON format" },
                { status: 400 },
            );
        }

        const { max_player, is_solo } = body;

        // Panggil Service Layer langsung — semua business logic dan validasi ada di sana
        const result = await quizService.duplicateRoom(
            gameRoomId,
            Number(max_player),
            Boolean(is_solo),
        );

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        // Error handling standard untuk API Route
        const errorMessage =
            error instanceof Error ? error.message : "Internal Server Error";

        // Map domain errors ke HTTP status code
        let status = 500;
        if (errorMessage.includes("Invalid max_player")) status = 400;
        if (
            errorMessage.includes("Room tidak ditemukan") ||
            errorMessage.includes("Tidak ada pertanyaan")
        )
            status = 404;

        return NextResponse.json(
            {
                error: errorMessage,
                debug: {
                    stack: error instanceof Error ? error.stack : undefined,
                },
            },
            { status },
        );
    }
}
