/**
 * POST /api/user-character
 * http://localhost:3000/api/user-character
 *
 * Body:
 *   {
 *     "user_id": "c307f9dc-482f-4442-b566-97dbc258c0e8",
 *     "character_id": 2,
 *     "cost": 7500,
 *     "base_character": "Slime",
 *     "skin_level": "epic"
 *   }
 *
 * Fungsi:
 *   1. Menambahkan suatu baris record baru ke tabel user_characters dan sekaligus melakukan
 *      update tabel users menggunakan transactions
 *   2. Tujuan utamanya ketika ingin user ingin membeli suatu skin, maka akan dicek terlebih dahulu
 *      apakah user memiliki skin dengan skin_level = default terlebih dahulu?
 *      a. Jika iya maka skin yg baru dibeli akan dimasukkan ke tabel user_characters dan
 *         tabel users akan diupdate dengan mengurangi coin = coin - cost skin
 *      b. Jika tidak maka user tidak diperkenankan untuk membeli dan menambahkan skin
 *         yang bersangkutan ke dalam tabel user_characters
 */
import { NextResponse } from "next/server";
import { userBuyCharacterSchema } from "@/modules/characters/character.schema";
import { characterServices } from "@/modules/characters/character.service";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const validation = userBuyCharacterSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    error: {
                        code: "VALIDATION_ERROR",
                        message:
                            "Data tidak lengkap atau tidak valid untuk melakukan pembelian",
                        details: validation.error.format(),
                    },
                },
                { status: 400 },
            );
        }

        await characterServices.buyCharacter(validation.data);

        return NextResponse.json({
            message: "Berhasil melakukan pembelian karakter baru",
        });
    } catch (error: any) {
        console.error("API Error [POST /api/user-character]:", error);

        // Check if it's a known error from the service
        const status =
            error.message &&
            (error.message.includes("Coin") ||
                error.message.includes("default"))
                ? 400
                : 500;

        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status },
        );
    }
}
