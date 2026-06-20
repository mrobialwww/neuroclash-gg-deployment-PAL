import { NextRequest, NextResponse } from "next/server";
import { quizService } from "@/modules/quiz/quiz.service";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ game_room_id: string }> },
) {
    try {
        const { game_room_id } = await params;

        // Ambil data body dari request
        const body = await request.json();
        const { user_id, room_code } = body;

        if (!user_id) {
            return NextResponse.json(
                { error: "Property 'user_id' wajib dikirim" },
                { status: 400 },
            );
        }

        // Panggil service untuk validasi kode room dan registrasi participant
        const joinResult = await quizService.joinRoomByCode(
            game_room_id,
            user_id,
            room_code,
        );

        return NextResponse.json({
            success: true,
            data: joinResult,
        });
    } catch (error) {
        console.error(
            `API Error [POST /api/user-game/join/${await params.then(
                (p) => p.game_room_id,
            )}]:`,
            error,
        );

        // Cek jika error berasal dari "Kode room tidak valid" maka set status 403 (Forbidden)
        const errorMessage =
            error instanceof Error ? error.message : "Internal Server Error";
        const statusCode = errorMessage === "Kode room tidak valid" ? 403 : 500;

        return NextResponse.json(
            { error: errorMessage },
            { status: statusCode },
        );
    }
}
