"use client";

import { useState, useEffect, useCallback } from "react";
import { LeaderboardRankEntry } from "@/types";
import { LeaderboardRow } from "./LeaderboardRow";
import { LeaderboardTableHeader } from "./LeaderboardTableHeader";
import { LeaderboardBadge } from "./LeaderboardBadge";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const LIMIT = 10;

const TABLE_COLUMNS = [
    { label: "Peringkat" },
    { label: "Pemain" },
    { label: "Rank" },
    { label: "Trophy" },
];

export function LeaderboardClient() {
    const [entries, setEntries] = useState<LeaderboardRankEntry[]>([]);
    const [myEntry, setMyEntry] = useState<LeaderboardRankEntry | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLeaderboard = useCallback(async (p: number) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/leaderboard?page=${p}&limit=${LIMIT}`,
                {
                    credentials: "include",
                },
            );
            const json = await res.json();

            if (!json.success) {
                setError("Gagal memuat data leaderboard.");
                return;
            }

            setEntries(json.data ?? []);
            setMyEntry(json.myEntry ?? null);
            setTotalPages(json.pagination?.totalPages ?? 1);
            setTotal(json.pagination?.total ?? 0);
        } catch {
            setError("Terjadi kesalahan jaringan.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaderboard(page);
    }, [page, fetchLeaderboard]);

    const handlePrev = () => setPage((p) => Math.max(1, p - 1));
    const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

    return (
        <div className="relative min-h-screen w-full overflow-x-hidden">
            <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-16">
                {/* Badge Title */}
                <div className="relative mb-12 flex justify-center">
                    <div className="relative w-full max-w-[480px]">
                        <LeaderboardBadge title="Pemain Teratas" />
                    </div>
                </div>

                {/* Main Table Container */}
                <div className="w-full">
                    <div className="scrollbar-hide w-full overflow-x-auto">
                        <div className="min-w-[700px]">
                            {/* Header */}
                            <LeaderboardTableHeader columns={TABLE_COLUMNS} />

                            {/* Body */}
                            {loading ? (
                                <div className="flex flex-col gap-2">
                                    {Array.from({ length: LIMIT }).map(
                                        (_, i) => (
                                            <div
                                                key={`leaderboard-skeleton-${i}`}
                                                className="grid animate-pulse grid-cols-[80px_minmax(160px,1fr)_140px_140px] items-center gap-4 rounded-lg bg-white/5 px-6 py-3 transition-all duration-200 md:gap-8"
                                            >
                                                {/* Position */}
                                                <div className="flex items-center justify-center">
                                                    <div className="h-8 w-8 rounded bg-white/10"></div>
                                                </div>

                                                {/* Player */}
                                                <div className="flex min-w-0 items-center gap-4">
                                                    <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 sm:h-11 sm:w-11"></div>
                                                    <div className="h-4 w-24 rounded bg-white/10 sm:w-32"></div>
                                                </div>

                                                {/* Rank */}
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="h-10 w-10 shrink-0 rounded bg-white/10 sm:h-11 sm:w-11"></div>
                                                    <div className="h-4 w-16 rounded bg-white/10 sm:w-20"></div>
                                                </div>

                                                {/* Trophy */}
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="h-4 w-4 shrink-0 rounded bg-white/10"></div>
                                                    <div className="h-4 w-8 rounded bg-white/10 sm:w-10"></div>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            ) : error ? (
                                <div className="py-16 text-center text-sm text-white/60">
                                    {error}
                                </div>
                            ) : entries.length === 0 ? (
                                <div className="py-16 text-center text-sm text-white/60">
                                    Belum ada data pemain.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {/* Show "Me" at TOP if not in current page and rank is higher */}
                                    {myEntry &&
                                        entries.length > 0 &&
                                        myEntry.position <
                                            entries[0].position &&
                                        !entries.some(
                                            (e) =>
                                                e.user_id === myEntry.user_id,
                                        ) && (
                                            <div className="mb-2">
                                                <LeaderboardRow
                                                    entry={myEntry}
                                                    isMe
                                                />
                                                <div className="mt-2 h-px w-full bg-white/10" />
                                            </div>
                                        )}

                                    {entries.map((entry) => {
                                        const isMe =
                                            myEntry?.user_id === entry.user_id;
                                        return (
                                            <LeaderboardRow
                                                key={entry.user_id}
                                                entry={entry}
                                                isMe={isMe}
                                            />
                                        );
                                    })}

                                    {/* Show "Me" at BOTTOM if not in current page and rank is lower */}
                                    {myEntry &&
                                        entries.length > 0 &&
                                        myEntry.position >
                                            entries[entries.length - 1]
                                                .position &&
                                        !entries.some(
                                            (e) =>
                                                e.user_id === myEntry.user_id,
                                        ) && (
                                            <div className="mt-2">
                                                <div className="mb-2 h-px w-full bg-white/10" />
                                                <LeaderboardRow
                                                    entry={myEntry}
                                                    isMe
                                                />
                                            </div>
                                        )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-end px-1">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrev}
                                disabled={page === 1}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30 sm:h-9 sm:w-9"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="md:text-md min-w-[80px] text-center text-sm font-medium text-white">
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={handleNext}
                                disabled={page === totalPages}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30 sm:h-9 sm:w-9"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
