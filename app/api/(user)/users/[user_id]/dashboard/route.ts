/**
 * GET /api/users/[user_id]/dashboard
 * http://localhost:3000/api/users/c307f9dc-482f-4442-b566-97dbc258c0e8/dashboard
 *
 * Fungsi:
 *   1. Mendapatkan data dashboard untuk user (user info, rank, active character)
 *   2. Tujuan utamanya ketika dashboard page ingin mendapatkan data user
 */

import { userService } from "@/modules/users/user.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ user_id: string }> },
) {
    try {
        const { user_id } = await params;

        const dashboardData = await userService.getDashboardData(user_id);

        if (!dashboardData) {
            return NextResponse.json(
                { success: false, error: "User not found or missing dashboard data" },
                { status: 404 },
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "Dashboard data retrieved successfully",
                data: dashboardData,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
