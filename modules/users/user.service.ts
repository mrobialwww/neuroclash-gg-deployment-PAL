import { leaderboardRepository } from "@/modules/leaderboards/leaderboard.repository";
import { userRepository } from "@/modules/users/user.repository";

export const userService = {
    async getUserById(userId: string) {
        if (!userId) return null;
        return await userRepository.getUserById(userId);
    },

    async getNavbarData(userId: string) {
        if (!userId) return null;
        try {
            const data = await userRepository.getUserWithActiveCharacter(userId);
            if (!data) return null;

            // Mapping character
            const userChars = data.user_characters;
            const activeChar = Array.isArray(userChars)
                ? userChars.find((uc: any) => uc.is_used)?.characters
                : null;

            return {
                username: data.username || "Guest",
                coins: data.coin || 0,
                avatar: activeChar?.image_url || "/default/Slime.webp",
            };
        } catch (error) {
            console.error("[Service] Critical Error in getNavbarData:", error);
            return null;
        }
    },

    async getDashboardData(userId: string) {
        if (!userId) return null;
        
        try {
            const user = await userRepository.getUserWithActiveCharacter(userId);
            if (!user) return null;

            const rank = await leaderboardRepository.getRankByTrophy(
                user.total_trophy || 0,
            );

            const activeChar = Array.isArray(user.user_characters)
                ? user.user_characters.find((uc: any) => uc.is_used)?.characters
                : null;

            return {
                username: user.username,
                coins: user.coin,
                trophy: user.total_trophy,
                rankName: rank?.name || "Bronze",
                rankImageUrl: rank?.image_url || "/rank/bronze.webp",
                avatar: activeChar?.image_url || "/default/Slime.webp",
            };
        } catch (error) {
            console.error("[Service] Error in getDashboardData:", error);
            return null;
        }
    },
};
