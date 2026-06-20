import { NextRequest, NextResponse } from "next/server";
import { gameRoomService } from "@/modules/games/game.service";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get("user_id");

        if (!userId) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 },
            );
        }

        // Menjalankan kedua query secara paralel menggunakan Promise.all
        // Jauh lebih cepat daripada menunggunya satu per satu
        const [publicRooms, userRooms] = await Promise.all([
            gameRoomService.getPublicOpenRooms(),
            gameRoomService.getUserRooms(userId),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                publicRooms,
                userRooms,
            },
        });
    } catch (error) {
        console.error("API Error [GET /api/rooms/dashboard]:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
