"use client";

import { PaginatedUserGameHistory } from "@/modules/histories/history.schema";
import { historyService } from "@/modules/histories/history.service";
import { useQuery } from "@tanstack/react-query";

/**
 * Query key factory untuk history — memastikan cache terisolasi per user & page
 */
export const historyKeys = {
    all: (userId: string) => ["userGameHistory", userId] as const,
    page: (userId: string, page: number, limit: number) =>
        ["userGameHistory", userId, page, limit] as const,
};

/**
 * React Query hook untuk fetch history pertandingan user dengan pagination.
 * Caching otomatis ditangani TanStack React Query (staleTime & gcTime dari QueryProvider).
 *
 * @param userId - ID user yang sedang login
 * @param page - Halaman aktif (default 1)
 * @param limit - Jumlah item per halaman (default 10)
 */
export function useUserGameHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
) {
    return useQuery<PaginatedUserGameHistory, Error>({
        queryKey: historyKeys.page(userId, page, limit),
        queryFn: async () => {
            const res = await fetch(
                `/api/history/${userId}?page=${page}&limit=${limit}`,
                {
                    credentials: "include",
                },
            );
            if (!res.ok) throw new Error("Failed to fetch history");
            return res.json();
        },
        enabled: !!userId,
        placeholderData: (previousData) => previousData, // Tetap tampil data lama saat ganti halaman
    });
}
