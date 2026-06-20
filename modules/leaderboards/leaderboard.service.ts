import { LeaderboardEntry, LeaderboardRankEntry } from "@/modules/leaderboards/leaderboard.schema";
import { leaderboardRepository } from "@/modules/leaderboards/leaderboard.repository";

export const leaderboardService = {
    async getLeaderboard(
        page: number,
        limit: number
    ): Promise<{
        data: LeaderboardRankEntry[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        const { data, count } = await leaderboardRepository.getLeaderboard(page, limit);
        const offset = (page - 1) * limit;

        // Enrich with rank data in parallel
        const enriched: LeaderboardRankEntry[] = await Promise.all(
            data.map(async (entry: LeaderboardEntry, i: number) => {
                const rank = await leaderboardRepository.getRankByTrophy(entry.total_trophy);
                return {
                    ...entry,
                    position: offset + i + 1,
                    rank: rank ?? null,
                };
            })
        );

        return {
            data: enriched,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit),
            },
        };
    },

    async getUserLeaderboardEntry(
        userId: string
    ): Promise<LeaderboardRankEntry | null> {
        const entry = await leaderboardRepository.getUserLeaderboardEntry(userId);
        if (!entry) return null;

        const rank = await leaderboardRepository.getRankByTrophy(entry.total_trophy);
        return { ...entry, rank: rank ?? null };
    },

    /**
     * Get the currently authenticated user's ID.
     * Digunakan oleh API route untuk mendapatkan user context tanpa akses Supabase langsung.
     */
    async getCurrentUserId(): Promise<string | null> {
        return await leaderboardRepository.getCurrentUserId();
    },
};