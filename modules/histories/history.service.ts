import { formatToWIBDate, formatToWIBTime } from "@/lib/utils/dateUtils";
import { historyRepository } from "@/modules/histories/history.repository";
import {
    GetHistoryQueryRequest,
    UserGame,
    GameRoom,
    UserGameHistory,
    PaginatedUserGameHistory,
    HistoryItem,
} from "@/modules/histories/history.schema";

/**
 * historyService.ts
 * Layer: Service — business logic for history and statistics.
 */
export const historyService = {
    /**
     * Get paginated match history with global statistics.
     */
    async getPaginatedHistory(payload: GetHistoryQueryRequest) {
        const { userId, page, limit } = payload;
        const offset = (page - 1) * limit;

        // 1. Fetch user records from history
        const { data: userGamesData, count } =
            await historyRepository.getUserGameHistory(userId, offset, limit);

        // 2. Fetch global statistics from user profile
        let userData = null;
        try {
            userData = await historyRepository.getUserStats(userId);
        } catch (userError) {
            console.warn(
                "[HistoryService] Warning getting user stats:",
                userError,
            );
        }

        // 3. Fetch Game Room details
        let combinedData: (UserGame & {
            game_rooms: GameRoom | { title: string; category: string };
        })[] = [];

        if (userGamesData && userGamesData.length > 0) {
            const roomIds = userGamesData.map((ug) => ug.game_room_id);
            let roomsData: GameRoom[] = [];

            try {
                roomsData = await historyRepository.getGameRooms(roomIds);
            } catch (roomsError) {
                console.error(
                    "[HistoryService] Error getting game rooms:",
                    roomsError,
                );
            }

            combinedData = userGamesData.map((ug) => ({
                ...ug,
                game_rooms: roomsData?.find(
                    (r) => r.game_room_id === ug.game_room_id,
                ) || {
                    game_room_id: ug.game_room_id,
                    title: "Unknown Match",
                    category: "General",
                },
            }));
        }

        // 4. Calculate formatted statistics (Source of Truth)
        const totalMatch = userData?.total_match || 0;
        const totalRank1 = userData?.total_rank_1 || 0;
        const placementRatio = userData?.placement_ratio || 0;

        // Win Rate: (total_rank_1 / total_match) * 100
        const winRate =
            totalMatch > 0
                ? ((totalRank1 / totalMatch) * 100).toFixed(2) + "%"
                : "0.00%";

        // Average Rank: (placement_ratio / total_match) * 100
        // Based on AGENTS.md formula: (Σ(placement / max_players) / total_match) * 100
        const averageRankPercent =
            totalMatch > 0
                ? ((placementRatio / totalMatch) * 100).toFixed(2)
                : "0.00";

        return {
            data: combinedData,
            pagination: {
                total: count ?? 0,
                page,
                limit,
                totalPages: Math.ceil((count ?? 0) / limit),
            },
            stats: {
                totalMatches: totalMatch,
                winRate,
                averageRank: averageRankPercent,
                firstPlaces: totalRank1,
            },
        };
    },

    /**
     * Transform API response ke HistoryItem format
     */
    transformToHistoryItem(rawData: UserGameHistory): HistoryItem {
        const timeStr = formatToWIBTime(rawData.created_at);
        const dateStr = formatToWIBDate(rawData.created_at);

        const category = rawData.game_rooms?.category || "umum";
        const title = rawData.game_rooms?.title || "Pertandingan";
        const placement = rawData.placement ? `${rawData.placement}` : "-";

        return {
            id: rawData.user_game_id,
            avatar: "", // Will be mapped in HistoryTable using current equipped avatar
            time: timeStr,
            date: dateStr,
            material: title,
            category: category,
            rank: placement,
            trophy: rawData.trophy_won,
            coin: rawData.coins_earned,
            win: rawData.win,
            lose: rawData.lose,
        };
    },

    /**
     * Fetch user game history dari API endpoint
     * Caching ditangani oleh TanStack React Query (lihat user.history.hook.ts)
     *
     * @param userId - ID user yang akan diquery
     * @param page - Halaman yang diminta (default 1)
     * @param limit - Jumlah item per halaman (default 10)
     */
    async fetchUserGameHistory(
        userId: string,
        page: number = 1,
        limit: number = 10,
    ): Promise<PaginatedUserGameHistory> {
        if (!userId) {
            return {
                history: [],
                pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
                stats: {
                    totalMatches: 0,
                    winRate: "0%",
                    averageRank: "0",
                    firstPlaces: 0,
                },
            };
        }

        const result = await this.getPaginatedHistory({
            userId,
            page,
            limit,
        });
        const historyItems = ((result.data as UserGameHistory[]) || []).map(
            this.transformToHistoryItem,
        );
        return {
            history: historyItems,
            pagination: result.pagination,
            stats: result.stats,
        };
    },

    /**
     * Get detail of a single game session including answer history.
     * Digunakan oleh GET /api/user-game/[user_game_id]
     */
    async getGameDetail(userGameId: string) {
        const summary = await historyRepository.getUserGameSummary(userGameId);
        const historyAnswer = await historyRepository.getUserGameAnswerHistory(
            summary.game_room_id,
            summary.user_id,
        );
        return { summary, historyAnswer };
    },
};
