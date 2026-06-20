import { createClient } from "@/lib/supabase/server";
import { getWIBNow } from "@/lib/utils/dateUtils";

export const userRepository = {
    async getUserById(userId: string) {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) {
            console.error("[Repo] Error fetching user:", error.message);
            throw new Error(error.message);
        }

        return data;
    },

    async getUserWithActiveCharacter(userId: string) {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("users")
            .select(
                `
                    *,
                    user_characters(
                        is_used,
                        characters(*)
                    )
                    `,
            )
            .eq("user_id", userId)
            .maybeSingle();

        if (error) {
            console.error("[Repo] Supabase Error:", error.message);
            throw new Error(error.message);
        }

        if (!data) {
            console.warn(`[Repo] No user found in DB for ID: ${userId}`);
            return null;
        }

        return data;
    },

    async updateUsername(userId: string, username: string) {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("users")
            .update({ username, updated_at: getWIBNow() })
            .eq("user_id", userId)
            .select()
            .maybeSingle();

        if (error) {
            console.error("[Repo] Error updating username:", error.message);
            throw new Error(error.message);
        }

        return data;
    },
};
