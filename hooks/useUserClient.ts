"use client";

import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface UserNavbarData {
    id: string;
    username: string;
    avatar: string;
    character: string;
}

/**
 * Query key factory untuk user client data
 */
export const userClientKeys = {
    currentUser: () => ["currentUser"] as const,
    matchData: (userId: string) => ["userMatchData", userId] as const,
};

/**
 * Pure fetch function — dipakai di Zustand stores dan React Query.
 * Ambil data user yang sedang login beserta karakter aktifnya.
 */
export async function getCurrentUserNavbarData(): Promise<UserNavbarData | null> {
    try {
        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return null;

        const [userRes, charRes] = await Promise.all([
            fetch(`/api/users/${user.id}`, {
                cache: "no-store",
                credentials: "include",
            }),
            fetch(`/api/user-character/${user.id}?is_used=true`, {
                cache: "no-store",
                credentials: "include",
            }),
        ]);

        if (!userRes.ok) return null;

        const userResult = await userRes.json();
        // /api/users returns `data` as array
        const userData = Array.isArray(userResult.data)
            ? userResult.data[0]
            : userResult.data;

        // /api/user-character?is_used=true returns characters[] with user_characters joined
        // Each element is a `characters` row directly with image_url and name at root
        let characterData: {
            name: string;
            image_url: string;
            skin_name: string;
        } | null = null;
        if (charRes.ok) {
            const charResult = await charRes.json();
            const raw = charResult.data;
            characterData = Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
        }

        return {
            id: user.id,
            username: userData?.username || "Guest",
            avatar: characterData?.image_url || "/default/Slime.webp",
            character: characterData?.skin_name || "Slime",
        };
    } catch (error) {
        console.error("[useUserClient] Failed to fetch current user:", error);
        return null;
    }
}

/**
 * Pure fetch function — dipakai di Zustand stores dan React Query.
 * Ambil data user lain berdasarkan userId (misal: untuk tampilan match/room).
 */
export async function getUserMatchData(
    userId: string,
): Promise<UserNavbarData | null> {
    if (!userId) return null;
    try {
        const [userRes, charRes] = await Promise.all([
            fetch(`/api/users/${userId}`, {
                cache: "no-store",
                credentials: "include",
            }),
            fetch(`/api/user-character/${userId}?is_used=true`, {
                cache: "no-store",
                credentials: "include",
            }),
        ]);

        if (!userRes.ok) return null;

        const userResult = await userRes.json();
        const userData = Array.isArray(userResult.data)
            ? userResult.data[0]
            : userResult.data;

        let characterData: {
            name: string;
            image_url: string;
            skin_name: string;
        } | null = null;
        if (charRes.ok) {
            const charResult = await charRes.json();
            const raw = charResult.data;
            characterData = Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
        }

        return {
            id: userId,
            username: userData?.username || "Pemain",
            avatar: characterData?.image_url || "/default/Slime.webp",
            character: characterData?.skin_name || "Slime",
        };
    } catch (error) {
        console.error("[useUserClient] Failed to fetch user match data:", error);
        return null;
    }
}

/**
 * React Query hook — untuk komponen yang membutuhkan data user yang sedang login.
 * Memanfaatkan caching TanStack React Query (staleTime & gcTime dari QueryProvider).
 */
export function useCurrentUser() {
    return useQuery<UserNavbarData | null, Error>({
        queryKey: userClientKeys.currentUser(),
        queryFn: getCurrentUserNavbarData,
        staleTime: 2 * 60 * 1000, // 2 menit — data user navbar jarang berubah
    });
}

/**
 * React Query hook — untuk komponen yang membutuhkan data user lain berdasarkan ID.
 * Digunakan di tampilan match/room untuk menampilkan info lawan.
 */
export function useUserMatchData(userId: string) {
    return useQuery<UserNavbarData | null, Error>({
        queryKey: userClientKeys.matchData(userId),
        queryFn: () => getUserMatchData(userId),
        enabled: !!userId,
        staleTime: 2 * 60 * 1000,
    });
}
