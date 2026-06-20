"use client";

import { useState } from "react";
import { StatisticCard } from "@/components/history/StatisticCard";
import { HistoryTable } from "@/components/history/HistoryTable";
import { useUserGameHistory } from "@/hooks/useGameHistoryHook";

type Props = {
    userId: string;
};

export default function HistoryClient({ userId }: Props) {
    const [page, setPage] = useState(1);

    const { data, isLoading, isError, error } = useUserGameHistory(
        userId,
        page,
    );

    const history = data?.history ?? [];
    const pagination = data?.pagination ?? {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
    };
    const stats = data?.stats ?? {
        totalMatches: 0,
        winRate: "0%",
        averageRank: "0",
        firstPlaces: 0,
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPage(newPage);
        }
    };

    if (isLoading && history.length === 0) {
        return (
            <main className="mx-auto max-w-[1400px] animate-pulse px-6 py-10 pb-20 md:px-12 lg:px-16">
                <h2 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                    Statistik Pertandingan
                </h2>

                <div className="mb-8 grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex min-h-[90px] flex-col justify-between rounded-xl bg-white/5 p-4 md:min-h-[120px] md:p-5"
                        >
                            <div className="flex items-start justify-between">
                                <div className="h-4 w-24 rounded bg-white/10 md:h-5 md:w-32" />
                                <div className="h-8 w-8 rounded bg-white/10 md:h-10 md:w-10" />
                            </div>
                            <div className="mt-2 h-8 w-16 rounded bg-white/10 md:mt-auto md:h-12 md:w-24" />
                        </div>
                    ))}
                </div>

                <h2 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                    Riwayat Pertandingan
                </h2>

                <div className="w-full overflow-hidden rounded-2xl border border-white/5 bg-white/5">
                    <div className="h-12 w-full bg-white/10" />
                    <div className="divide-y divide-white/5">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex h-[72px] items-center gap-8 px-6"
                            >
                                <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 sm:h-12 sm:w-12" />
                                <div className="hidden h-5 w-16 rounded bg-white/10 md:block" />
                                <div className="hidden h-5 w-20 rounded bg-white/10 lg:block" />
                                <div className="h-5 flex-1 rounded bg-white/10" />
                                <div className="hidden h-5 w-24 rounded bg-white/10 sm:block" />
                                <div className="h-5 w-8 rounded bg-white/10" />
                                <div className="h-5 w-8 rounded bg-white/10" />
                                <div className="h-5 w-16 rounded bg-white/10" />
                                <div className="h-5 w-16 rounded bg-white/10" />
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        );
    }

    if (isError) {
        return (
            <main className="mx-auto max-w-[1400px] px-6 py-10 pb-20 md:px-12 lg:px-16">
                <h2 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                    Statistik Pertandingan
                </h2>
                <div className="text-center text-red-400">
                    Error:{" "}
                    {error?.message ?? "Gagal memuat riwayat pertandingan"}
                </div>
            </main>
        );
    }

    const statsData = [
        {
            label: "Total Pertandingan",
            value: stats.totalMatches,
            iconPath: "/icons/sword.svg",
        },
        {
            label: "Win Rate",
            value: stats.winRate,
            iconPath: "/icons/percent.svg",
        },
        {
            label: "Peringkat Rata-rata",
            value: stats.averageRank,
            iconPath: "/icons/chart.svg",
        },
        {
            label: "Peringkat 1",
            value: stats.firstPlaces,
            iconPath: "/icons/trophy.svg",
        },
    ];

    return (
        <main className="mx-auto max-w-[1400px] px-6 py-10 pb-20 md:px-12 lg:px-16">
            <h2 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                Statistik Pertandingan
            </h2>

            <div className="mb-8 grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
                {statsData.map((stat, index) => (
                    <StatisticCard
                        key={index}
                        label={stat.label}
                        value={stat.value}
                        iconPath={stat.iconPath}
                    />
                ))}
            </div>

            <h2 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                Riwayat Pertandingan
            </h2>

            <HistoryTable
                historyData={history}
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                isLoading={isLoading}
            />
        </main>
    );
}
