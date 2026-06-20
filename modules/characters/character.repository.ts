import { createClient } from "@/lib/supabase/server";
import { Character } from "@/modules/characters/character.schema";

export const characterRepository = {
    async findAllCharacters(skinLevel?: string | null): Promise<Character[]> {
        const supabase = await createClient();

        let query = supabase
            .from("characters")
            .select("*, user_characters(user_id, is_used)");

        if (skinLevel) {
            query = query.eq("skin_level", skinLevel);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching characters:", error);
            throw new Error(error.message);
        }

        return (data || []) as Character[];
    },

    async findUserCharacters(
        userId: string,
        isUsed?: boolean,
    ): Promise<Character[]> {
        const supabase = await createClient();

        let query = supabase
            .from("characters")
            .select("*, user_characters!inner(user_id, is_used)")
            .eq("user_characters.user_id", userId);

        if (isUsed !== undefined) {
            query = query.eq("user_characters.is_used", isUsed);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching user characters:", error);
            throw new Error(error.message);
        }

        return data || [];
    },

    /**
     * Menghandle pembelian item (karakter/skin) menggunakan stored procedure (RPC) di Supabase.
     * RPC ini akan mengecek requirement koin, requirement default character, update balance,
     * dan insert ke user_characters dalam satu transaction.
     */
    async handleBuyItem(
        userId: string,
        characterId: number,
        cost: number,
        baseCharacter: string,
        skinLevel: string,
    ) {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc("handle_buy_item", {
            p_user_id: userId,
            p_character_id: characterId,
            p_cost: cost,
            p_base_character: baseCharacter,
            p_skin_level: skinLevel,
        });

        if (error) {
            throw new Error(error.message);
        }

        return data;
    },

    /**
     * Menghandle pemilihan karakter yang akan digunakan
     */
    async handleEquipCharacter(userId: string, characterId: number) {
        const supabase = await createClient();
        const { error } = await supabase.rpc("handle_equip_character", {
            p_user_id: userId,
            p_character_id: characterId,
        });

        if (error) {
            throw new Error(error.message);
        }
    },
};
