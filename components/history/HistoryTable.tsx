"use client";

import Image from "next/image";
import { HistoryItem } from "@/types/HistoryItem";
import { getCharacterBgColor } from "@/lib/constants/characters";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useUserStore } from "@/store/useUserStore";

interface HistoryTableProps {
    historyData: HistoryItem[];
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    isLoading?: boolean;
}

export function HistoryTable({
    historyData,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    isLoading = false,
}: HistoryTableProps) {
    const { avatar: equippedAvatar, baseCharacter: equippedBaseCharacter } =
        useUserStore();

    return (
        <div className="flex flex-col gap-4">
            <div className="w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_4px_25px_rgba(0,0,0,0.05)]">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-center">
                        <thead>
                            <tr className="bg-[#4D70E8] text-white">
                                <th className="px-4 py-3 text-sm font-bold md:px-6 md:py-4 md:text-base"></th>
                                <th className="px-4 py-3 text-sm font-bold md:px-6 md:py-4 md:text-base">
                                    Waktu
                                </th>
                                <th className="px-4 py-3 text-sm font-bold md:px-6 md:py-4 md:text-base">
                                    Tanggal
                                </th>
                                <th className="px-4 py-3 text-sm font-bold md:px-6 md:py-4 md:text-base">
                                    Materi
                                </th>
                                <th className="px-4 py-3 text-sm font-bold md:px-6 md:py-4 md:text-base">
                                    Kategori
                                </th>
                                <th className="px-4 py-3 text-sm font-bold md:px-6 md:py-4 md:text-base">
                                    Menang
                                </th>
                                <th className="px-4 py-3 text-sm font-bold md:px-6 md:py-4 md:text-base">
                                    Kalah
                                </th>
                                <th className="px-4 py-3 text-sm font-bold md:px-6 md:py-4 md:text-base">
                                    Tropi
                                </th>
                                <th className="px-4 py-3 text-sm font-bold md:px-6 md:py-4 md:text-base">
                                    Coin
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr
                                        key={`skeleton-${i}`}
                                        className="animate-pulse"
                                    >
                                        <td className="px-4 py-3 md:px-6 md:py-4">
                                            <div className="flex justify-end">
                                                <div className="h-10 w-10 rounded-full bg-gray-100 md:h-12 md:w-12"></div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-4">
                                            <div className="mx-auto h-4 w-12 rounded bg-gray-100 md:h-5 md:w-16"></div>
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-4">
                                            <div className="mx-auto h-4 w-16 rounded bg-gray-100 md:h-5 md:w-20"></div>
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-4">
                                            <div className="h-4 w-28 rounded bg-gray-100 md:h-5 md:w-36"></div>
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-4">
                                            <div className="mx-auto h-4 w-20 rounded bg-gray-100 md:h-5 md:w-24"></div>
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-4">
                                            <div className="mx-auto h-5 w-6 rounded bg-gray-100 md:h-6 md:w-8"></div>
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-4">
                                            <div className="mx-auto h-5 w-6 rounded bg-gray-100 md:h-6 md:w-8"></div>
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-4">
                                            <div className="mx-auto h-4 w-12 rounded bg-gray-100 md:h-5 md:w-16"></div>
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-4">
                                            <div className="mx-auto h-4 w-12 rounded bg-gray-100 md:h-5 md:w-16"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : historyData.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="py-20 text-center text-gray-400"
                                    >
                                        Belum ada riwayat pertandingan.
                                    </td>
                                </tr>
                            ) : (
                                historyData.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="transition-colors hover:bg-gray-50/50"
                                    >
                                        {/* Avatar */}
                                        <td className="px-4 py-2 md:px-6 md:py-3">
                                            <div className="flex justify-end">
                                                <div
                                                    className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm md:h-12 md:w-12"
                                                    style={{
                                                        backgroundColor:
                                                            getCharacterBgColor(
                                                                item.baseCharacter ||
                                                                    equippedBaseCharacter ||
                                                                    "Slime",
                                                            ),
                                                    }}
                                                >
                                                    <Image
                                                        src={
                                                            item.avatar ||
                                                            equippedAvatar ||
                                                            "/default/Slime.webp"
                                                        }
                                                        alt="Player Avatar"
                                                        fill
                                                        sizes="(max-width: 768px) 40px, 48px"
                                                        className="object-contain p-1"
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        {/* Waktu */}
                                        <td className="px-4 py-3 md:px-6 md:py-5">
                                            <span className="whitespace-nowrap text-sm font-medium text-[#555555] md:text-base">
                                                {item.time}
                                            </span>
                                        </td>

                                        {/* Tanggal */}
                                        <td className="px-4 py-3 md:px-6 md:py-5">
                                            <span className="whitespace-nowrap text-sm font-medium text-[#555555] md:text-base">
                                                {item.date}
                                            </span>
                                        </td>

                                        {/* Materi */}
                                        <td className="px-4 py-3 text-left md:px-6 md:py-5">
                                            <span className="text-sm font-semibold text-[#555555] md:text-base">
                                                {item.material}
                                            </span>
                                        </td>

                                        {/* Kategori */}
                                        <td className="px-4 py-3 md:px-6 md:py-5">
                                            <span className="whitespace-nowrap text-sm font-medium text-[#555555] md:text-base">
                                                {item.category
                                                    ?.toLowerCase()
                                                    .replace(/\b\w/g, (char) =>
                                                        char.toUpperCase(),
                                                    ) || "-"}
                                            </span>
                                        </td>

                                        {/* Menang */}
                                        <td className="px-4 py-3 md:px-6 md:py-5">
                                            <span className="text-base font-bold text-green-600 md:text-lg">
                                                {item.win ?? 0}
                                            </span>
                                        </td>

                                        {/* Kalah */}
                                        <td className="px-4 py-3 md:px-6 md:py-5">
                                            <span className="text-base font-bold text-red-600 md:text-lg">
                                                {item.lose ?? 0}
                                            </span>
                                        </td>

                                        {/* Tropi */}
                                        <td className="px-4 py-3 md:px-6 md:py-5">
                                            <div className="flex items-center justify-center gap-1.5 md:gap-2">
                                                <div className="relative h-5 w-5 md:h-6 md:w-6">
                                                    <Image
                                                        src="/icons/trophy-color.svg"
                                                        alt="Trophy"
                                                        fill
                                                        sizes="(max-width: 768px) 20px, 24px"
                                                        className="object-contain"
                                                    />
                                                </div>
                                                <span className="text-sm font-medium text-[#555555] md:text-base">
                                                    {item.trophy >= 0
                                                        ? "+"
                                                        : ""}
                                                    {item.trophy}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Coin */}
                                        <td className="px-4 py-3 md:px-6 md:py-5">
                                            <div className="flex items-center justify-center gap-1.5 md:gap-2">
                                                <div className="relative h-5 w-5 md:h-6 md:w-6">
                                                    <Image
                                                        src="/icons/coin-color.svg"
                                                        alt="Coin"
                                                        fill
                                                        sizes="(max-width: 768px) 20px, 24px"
                                                        className="object-contain"
                                                    />
                                                </div>
                                                <span className="text-sm font-medium text-[#555555] md:text-base">
                                                    {item.coin >= 0 ? "+" : ""}
                                                    {item.coin}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Footer */}
            {!isLoading && totalPages > 1 && (
                <div className="flex items-center justify-end px-1">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange?.(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30 sm:h-9 sm:w-9"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="min-w-[80px] text-center text-sm font-medium text-white md:text-base">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => onPageChange?.(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30 sm:h-9 sm:w-9"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
