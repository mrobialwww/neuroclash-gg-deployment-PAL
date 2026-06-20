/**
 * GET /api/user-character/[user_id]
 * http://localhost:3000/api/user-character/c307f9dc-482f-4442-b566-97dbc258c0e8
 *
 * Fungsi:
 *   1. Mendapatkan suatu baris record dari tabel characters berdasarkan user_id
 *   2. Tujuan utamanya ketika user berada di page yg menampilkan seluruh daftar character/skin yg
 *      dimiliki dengan semua skin_level
 *   3. Menggunakan inner join
 */

/**
 * GET /api/user-character/[user_id]?is_used=true
 * http://localhost:3000/api/user-character/c307f9dc-482f-4442-b566-97dbc258c0e8?is_used=true
 *
 * Fungsi:
 *   1. Mendapatkan suatu baris record dari tabel characters berdasarkan user_id dan is_used
 *   2. Tujuan utamanya ingin menampilkan karakter dari user yg akan digunakan di quiz/game,
 *      maka dari itu kita ambil yg is_used = true
 *   3. Menggunakan inner join
 */

/**
 * POST /api/user-character/[user_id]
 * http://localhost:3000/api/user-character/c307f9dc-482f-4442-b566-97dbc258c0e8
 *
 * Body:
 *   {
 *     "character_id": 2
 *   }
 *
 * Fungsi:
 *   1. Mengupdate atribute is_used di tabel user_characters berdasarkan user_id tertentu menjadi
 *      true dan yg lainnya false
 *   2. Tujuan utamanya ketika ingin user memilih karakter ketika akan mengikuti suatu game/quiz
 */

import { NextRequest, NextResponse } from "next/server";
import { characterServices } from "@/modules/characters/character.service";
import { userEquipCharacterSchema } from "@/modules/characters/character.schema";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ user_id: string }> },
) {
    try {
        const { user_id } = await params;
        const { searchParams } = new URL(request.url);

        const is_used = searchParams.get("is_used");

        // Convert string ke boolean
        const is_used_bool =
            is_used === "true" ? true : is_used === "false" ? false : undefined;

        const data = await characterServices.getUserCharacters(
            user_id,
            is_used_bool,
        );

        return NextResponse.json(
            {
                success: true,
                message: "Fetched user characters successfully",
                data,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ user_id: string }> },
) {
    try {
        const body = await request.json();
        const { user_id } = await params;

        // Validasi payload (memastikan character_id ada dan berupa positive integer)
        const validation = userEquipCharacterSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Data tidak lengkap atau tidak valid",
                        details: validation.error.format(),
                    },
                },
                { status: 400 },
            );
        }

        await characterServices.equipCharacter(
            user_id,
            validation.data.character_id,
        );

        return NextResponse.json({
            message: "Karakter telah berhasil dipilih",
        });
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 },
        );
    }
}
