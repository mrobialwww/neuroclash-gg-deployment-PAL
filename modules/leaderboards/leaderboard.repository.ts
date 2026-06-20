import { LeaderboardEntry, LeaderboardPositionEntry } from "@/modules/leaderboards/leaderboard.schema";
import { createClient } from "@/lib/supabase/server";

export const leaderboardRepository = {
    async getLeaderboard(
        page: number,
        limit: number
    ): Promise<{
        data: LeaderboardEntry[];
        count: number;
    }> {
        const supabase = await createClient();
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const {
        data: rawData,
        error,
        count,
        } = await supabase
            .from("users")
            .select(
                `
                user_id,
                username,
                total_trophy,
                total_match,
                created_at,
                user_characters(is_used, characters(image_url, base_character))
            `,
                { count: "exact" }
            )
            .order("total_trophy", { ascending: false })
            .order("total_match", { ascending: false })
            .order("created_at", { ascending: true })
            .range(from, to);

        if (error) {
            console.error("[LeaderboardRepo] Error:", error.message);
            throw new Error(error.message);
        }

        const data: LeaderboardEntry[] = (rawData || []).map((row: any) => {
            const activeChar = row.user_characters?.find(
                (uc: any) => uc.is_used
            )?.characters;
            return {
                user_id: row.user_id,
                username: row.username,
                total_trophy: row.total_trophy,
                total_match: row.total_match,
                created_at: row.created_at,
                character_image: activeChar?.image_url || "/icons/neuroclash.svg",
                base_character: activeChar?.base_character || row.username,
            };
        });

        return { data, count: count || 0 };
    },

    async getUserLeaderboardPosition(userId: string): Promise<number | null> {
        const supabase = await createClient();

        // Get all users sorted to find position
        const { data: rawData, error } = await supabase
            .from("users")
            .select("user_id, username, total_trophy, total_match, created_at")
            .order("total_trophy", { ascending: false })
            .order("total_match", { ascending: false })
            .order("created_at", { ascending: true });

        if (error || !rawData) {
            console.error("[LeaderboardRepo] Error fetching position:", error?.message);
            throw new Error(error?.message || "Data not found");
        }

        const idx = rawData.findIndex((u) => u.user_id === userId);
        return idx >= 0 ? idx + 1 : null;
    },

    async getUserLeaderboardEntry(
        userId: string
    ): Promise<LeaderboardPositionEntry | null> {
        const supabase = await createClient();

        const { data: rawData, error } = await supabase
            .from("users")
            .select(
                `
                user_id,
                username,
                total_trophy,
                total_match,
                created_at,
                user_characters(is_used, characters(image_url, base_character))
            `
            )
            .order("total_trophy", { ascending: false })
            .order("total_match", { ascending: false })
            .order("created_at", { ascending: true });

        if (error || !rawData) {
            console.error("[LeaderboardRepo] Error fetching user entry:", error?.message);
            throw new Error(error?.message || "Data not found");
        }

        const idx = rawData.findIndex((u) => u.user_id === userId);
        if (idx < 0) return null;

        const row = rawData[idx];
        const activeChar = (row.user_characters as any[])?.find((uc: any) => uc.is_used)?.characters;

        const formatted: LeaderboardEntry = {
            user_id: row.user_id,
            username: row.username,
            total_trophy: row.total_trophy,
            total_match: row.total_match,
            created_at: row.created_at,
            character_image: activeChar?.image_url || "/icons/neuroclash.svg",
            base_character: activeChar?.base_character || row.username,
        };
        return { ...formatted, position: idx + 1 };
    },

    async getRankByTrophy(trophy: number) {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("ranks")
            .select("*")
            .lte("min_trophy", trophy)
            .gte("max_trophy", trophy)
            .order("min_trophy", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error("[RankRepo] Error:", error.message);
            return null;
        }
        return data;
    },

    /**
     * Get the currently authenticated user's ID from Supabase Auth.
     */
    async getCurrentUserId(): Promise<string | null> {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id ?? null;
    },
};
