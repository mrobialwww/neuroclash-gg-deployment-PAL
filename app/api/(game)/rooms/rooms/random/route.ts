import { NextRequest, NextResponse } from "next/server";
import { gameRoomService } from "@/modules/games/game.service";

export async function GET(request: NextRequest) {
    try {
        // Ambil parameter limit dari URL query (contoh: ?limit=6)
        const searchParams = request.nextUrl.searchParams;
        const limitParam = searchParams.get("limit");

        // Parse limit, jadikan 4 sebagai default jika tidak ada parameter
        const limit = limitParam ? parseInt(limitParam, 10) : 4;

        // Validasi agar limit tidak bernilai negatif atau bukan angka
        if (isNaN(limit) || limit <= 0) {
            return NextResponse.json(
                {
                    error: "Parameter 'limit' tidak valid. Harus berupa angka positif.",
                },
                { status: 400 },
            );
        }

        // Panggil service layer
        const randomRooms = await gameRoomService.getRandomPublicRooms(limit);

        return NextResponse.json({
            success: true,
            data: randomRooms,
        });
    } catch (error) {
        console.error("API Error [GET /api/rooms/random]:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
