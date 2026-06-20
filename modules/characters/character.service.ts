import {
    Character,
    UserBuyCharacterRequest,
} from "@/modules/characters/character.schema";
import { characterRepository } from "@/modules/characters/character.repository";

export const characterServices = {
    async getAllCharacters(skin_level?: string | null): Promise<Character[]> {
        const data = await characterRepository.findAllCharacters(skin_level);
        return data;
    },

    /**
     * Fetch daftar character/skin yang dimiliki user dengan semua skin_level
     * Menggunakan inner join antara characters dan user_characters
     *
     * @param userId - ID user yang akan diquery
     * @param isUsed - Optional filter untuk hanya yang sedang digunakan (true/false)
     * @returns Array of characters with user_characters details (owned by user)
     */
    async getUserCharacters(
        userId: string,
        isUsed?: boolean,
    ): Promise<Character[]> {
        const data = await characterRepository.findUserCharacters(
            userId,
            isUsed,
        );
        return data;
    },

    /**
     * Handle proses transaksi pembelian karakter/skin
     * Hanya untuk dipanggil di sisi SERVER (API Route atau Server Action)
     */
    async buyCharacter(payload: UserBuyCharacterRequest) {
        if (payload.cost > payload.coin) {
            throw new Error("Coin tidak mencukupi untuk membeli item ini");
        }

        try {
            await characterRepository.handleBuyItem(
                payload.user_id,
                payload.character_id,
                payload.cost,
                payload.base_character,
                payload.skin_level,
            );
        } catch (error: any) {
            console.error("Error buying character:", error);
            throw new Error(
                error.message || "Gagal melakukan pembelian karakter.",
            );
        }
    },

    /**
     * Handle pemilihan karakter/skin yang akan dipakai
     */
    async equipCharacter(userId: string, characterId: number) {
        try {
            await characterRepository.handleEquipCharacter(userId, characterId);
        } catch (error: any) {
            console.error("Error equipping character:", error);
            throw new Error(error.message || "Gagal menggunakan karakter.");
        }
    },
};
