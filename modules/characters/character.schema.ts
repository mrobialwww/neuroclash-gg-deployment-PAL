import z from "zod";

export interface Character {
    character_id: number;
    image_url: string;
    cost: number;
    created_at?: string;
    updated_at?: string;
    base_character: string;
    skin_name: string;
    skin_level: "default" | "epic" | "legend";
}

export interface UserCharacterWithDetails extends Character {
    is_owned: boolean;
    is_used: boolean;
    user_characters?: { user_id: string; is_used: boolean }[];
}


export const userBuyCharacterSchema = z.object({
    user_id: z.string().min(1, "User ID is required"),
    character_id: z.number().int().positive("Character ID must be a positive integer"),
    cost: z.number().int().nonnegative("Cost must be a non-negative integer"),
    coin: z.number().int().nonnegative("Coin must be a non-negative integer"),
    base_character: z.string().min(1, "Base character is required"),
    skin_level: z.enum(["default", "epic", "legend"], {
        error: "Skin level must be 'default', 'epic', or 'legend'",
    }),
});

export const userEquipCharacterSchema = z.object({
    character_id: z.number().int().positive("Character ID must be a positive integer"),
});

export type UserBuyCharacterRequest = z.infer<typeof userBuyCharacterSchema>;
export type UserEquipCharacterRequest = z.infer<typeof userEquipCharacterSchema>;
