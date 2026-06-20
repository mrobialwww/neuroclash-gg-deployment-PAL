import { leaderboardService } from "@/modules/leaderboards/leaderboard.service";
import { NextRequest, NextResponse } from "next/server";
import { leaderboardQuerySchema } from "@/modules/leaderboards/leaderboard.schema";

export async function GET(request: NextRequest) {
    try {
        const userId = await leaderboardService.getCurrentUserId();

        const { searchParams } = new URL(request.url);

        const queryResult = leaderboardQuerySchema.safeParse({
            page: searchParams.get("page"),
            limit: searchParams.get("limit"),
        });

        if (!queryResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid query parameters",
                    details: queryResult.error.format(),
                },
                { status: 400 },
            );
        }

        const { page, limit } = queryResult.data;

        const { data, pagination } = await leaderboardService.getLeaderboard(
            page,
            limit,
        );

        // If user is logged in, also fetch their personal entry
        let myEntry = null;
        if (userId) {
            myEntry = await leaderboardService.getUserLeaderboardEntry(userId);
        }

        return NextResponse.json(
            {
                success: true,
                message: "Leaderboard retrieved successfully",
                data,
                pagination,
                myEntry,
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
