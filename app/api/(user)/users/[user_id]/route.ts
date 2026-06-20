/**
 * GET /api/users/[user_id]
 * http://localhost:3000/api/users/c307f9dc-482f-4442-b566-97dbc258c0e8
 *
 * Fungsi:
 *   1. Mendapatkan suatu baris record dari tabel users berdasarkan user_id
 *   2. Tujuan utamanya ketika user/creator game ingin mendapatkan detail users berdasarkan user_id
 */

import { userRepository } from "@/modules/users/user.repository";
import { userService } from "@/modules/users/user.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET({
    params,
}: {
    params: Promise<{ user_id: string }>;
}) {
    try {
        const { user_id } = await params;

        const data = await userService.getUserById(user_id);

        if (!data) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 },
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "User retrieved successfully",
                data: [data], // Wrapping in array to maintain backward compatibility if existing clients expect an array
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal Server Error",
            },
            { status: 500 },
        );
    }
}
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ user_id: string }> },
) {
    try {
        const { user_id } = await params;
        const { username } = await request.json();

        if (!username || username.trim().length < 3) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Username must be at least 3 characters long",
                },
                { status: 400 },
            );
        }

        const updatedUser = await userRepository.updateUsername(
            user_id,
            username,
        );

        return NextResponse.json(
            {
                success: true,
                message: "Username updated successfully",
                data: updatedUser,
            },
            { status: 200 },
        );
    } catch (error: any) {
        console.error("API Error updating username:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Internal Server Error" },
            { status: 500 },
        );
    }
}
