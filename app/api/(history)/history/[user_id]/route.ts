import { NextRequest, NextResponse } from "next/server";
import { historyService } from "@/modules/histories/history.service";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ user_id: string }> },
) {
    try {
        const { user_id } = await params;

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") ?? "1", 10);
        const limit = parseInt(searchParams.get("limit") ?? "10", 10);

        const result = await historyService.fetchUserGameHistory(
            user_id,
            page,
            limit,
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error("[History API] Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
