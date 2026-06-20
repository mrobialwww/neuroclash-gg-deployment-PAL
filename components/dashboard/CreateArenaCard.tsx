"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MainButton } from "@/components/common/MainButton";
import CreateArenaModal from "@/components/dashboard/CreateArenaOverlay";
import { ToastOverlay } from "@/components/common/ToastOverlay";
import { createClient } from "@/lib/supabase/client";
import { Difficulty } from "@/types/enums";

// ── Mapping category → kategori gambar room ──────────────────────────────
const CATEGORY_IMAGE_MAP: Record<string, string> = {
    bahasaindonesia:
        "https://cmgkgwzhiloxdttftmwf.supabase.co/storage/v1/object/public/room-categories/bahasaindonesia2.webp",
    bahasainggris:
        "https://cmgkgwzhiloxdttftmwf.supabase.co/storage/v1/object/public/room-categories/bahasainggris2.webp",
    biologi:
        "https://cmgkgwzhiloxdttftmwf.supabase.co/storage/v1/object/public/room-categories/biologi2.webp",
    pancasila:
        "https://cmgkgwzhiloxdttftmwf.supabase.co/storage/v1/object/public/room-categories/pancasila2.webp",
    pemrograman:
        "https://cmgkgwzhiloxdttftmwf.supabase.co/storage/v1/object/public/room-categories/pemrograman2.webp",
    sejarah:
        "https://cmgkgwzhiloxdttftmwf.supabase.co/storage/v1/object/public/room-categories/sejarah2.webp",
};

const DEFAULT_IMAGE_URL =
    "https://cmgkgwzhiloxdttftmwf.supabase.co/storage/v1/object/public/room-categories/default2.webp";

export function CreateArenaCard() {
    const router = useRouter();
    const [modalOpen, setModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("Memproses...");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [toastData, setToastData] = useState<{
        isOpen: boolean;
        title?: string;
        message?: React.ReactNode;
        isFailed?: boolean;
        primaryButtonText?: string;
        onPrimaryClick?: () => void;
        secondaryButtonText?: string;
        onSecondaryClick?: () => void;
    }>({ isOpen: false });

    const handleCreateArena = () => {
        setErrorMsg(null);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        if (!isLoading) setModalOpen(false);
    };

    /**
     * handleSubmitArena
     *
     * Alur:
     *  1. Dapatkan user_id dari Supabase Auth
     *  2. Bangun FormData (upload PDF) atau JSON (materi default)
     *  3. POST ke /api/quiz → Gemini generate + simpan langsung ke DB
     *  4. Redirect ke lobby room dengan game_room_id yang dikembalikan
     */
    const handleSubmitArena = async (data: {
        materiId: string | null;
        file: File | null;
        maxPlayers: number;
        jumlahSoal: number;
        difficulty: Difficulty;
        room_visibility: "public" | "private";
        title: string;
    }) => {
        setIsLoading(true);
        setLoadingText("Memvalidasi sesi user...");
        setErrorMsg(null);

        const AI_MESSAGES = [
            "AI sedang membaca materi...",
            "Merumuskan butir pertanyaan...",
            "Menyusun opsi jawaban kuis...",
            "Menganalisis tingkat kesulitan...",
            "Menyiapkan tantangan kuis untukmu...",
        ];

        let aiStatusInterval: any = null;

        try {
            // ── Step 1: Ambil user yang sedang login ──────────────────────────
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setErrorMsg("Kamu harus login sebelum membuat arena.");
                setIsLoading(false);
                return;
            }

            setLoadingText("Menghubungkan ke Gemini AI...");

            let messageIndex = 0;
            aiStatusInterval = setInterval(() => {
                setLoadingText(AI_MESSAGES[messageIndex]);
                messageIndex = (messageIndex + 1) % AI_MESSAGES.length;
            }, 2500);

            // ── Step 2: Request ke Gemini (/api/quiz) ────────────────────────
            let response: Response;

            if (data.file) {
                // Upload PDF fisik → multipart/form-data
                const formData = new FormData();
                formData.append("pdf", data.file);
                formData.append("round", String(data.jumlahSoal));
                formData.append("maxPlayer", String(data.maxPlayers));
                formData.append("difficulty", data.difficulty);
                formData.append("user_id", user.id);
                formData.append("room_visibility", data.room_visibility);

                response = await fetch("/api/quiz", {
                    method: "POST",
                    body: formData,
                    credentials: "include",
                });
            } else if (data.materiId) {
                // Materi default → application/json
                response = await fetch("/api/quiz", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        category: data.materiId,
                        difficulty: data.difficulty,
                        round: data.jumlahSoal,
                        maxPlayer: data.maxPlayers,
                        user_id: user.id,
                        room_visibility: data.room_visibility,
                    }),
                    credentials: "include",
                });
            } else {
                setErrorMsg(
                    "Pilih salah satu materi atau upload file PDF terlebih dahulu.",
                );
                setIsLoading(false);
                return;
            }

            const result = await response.json();

            if (aiStatusInterval) clearInterval(aiStatusInterval);

            if (!response.ok) {
                // Build a specific title based on HTTP status
                const statusCode = response.status;
                let toastTitle = "Pembuatan Gagal";
                if (statusCode === 503) toastTitle = "AI Kelebihan Beban";
                else if (statusCode === 429) toastTitle = "Kuota AI Habis";
                else if (statusCode === 400)
                    toastTitle = "File Tidak Dapat Dibaca";

                const errMsg: string =
                    result?.message ??
                    "Gagal meng-generate soal menggunakan AI.";

                // For retriable errors keep the modal open, only show toast
                const isRetriable = statusCode === 503 || statusCode === 429;
                if (isRetriable) {
                    setIsLoading(false);
                    setLoadingText("Memproses...");
                } else {
                    setModalOpen(false);
                }

                setToastData({
                    isOpen: true,
                    title: toastTitle,
                    message: errMsg,
                    isFailed: true,
                    primaryButtonText: "Tutup",
                    onPrimaryClick: () =>
                        setToastData((prev) => ({ ...prev, isOpen: false })),
                    secondaryButtonText: isRetriable ? "Coba Lagi" : undefined,
                    onSecondaryClick: isRetriable
                        ? () => {
                              setToastData((prev) => ({
                                  ...prev,
                                  isOpen: false,
                              }));
                              // re-submit with same data automatically
                              handleSubmitArena(data);
                          }
                        : undefined,
                });
                return;
            }

            // ── Step 3: Simpan ke DB (/api/game-rooms) ───────────────────────
            setLoadingText("Menyimpan Arena ke database...");
            const createRoomRes = await fetch("/api/game-rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: user.id,
                    category: data.materiId || "",
                    title: data.title,
                    max_player: data.maxPlayers,
                    total_round: data.jumlahSoal,
                    difficulty: data.difficulty,
                    room_visibility: data.room_visibility,
                    questions: result.geminiFile ? result.geminiFile : result,
                }),
                credentials: "include",
            });

            const createRoomResult = await createRoomRes.json();
            if (!createRoomRes.ok) {
                throw new Error(
                    createRoomResult.error ??
                        "Gagal menyimpan Game Room ke database.",
                );
            }

            const gameRoom = createRoomResult.data[0];

            // ── Step 4: Tampilkan Toast Sukses ───────────────────────────────────
            setModalOpen(false);
            setToastData({
                isOpen: true,
                title: "Arena Siap!",
                message: (
                    <div className="mt-2 flex w-full flex-col gap-3 text-left">
                        <p className="text-sm leading-snug text-white/80 md:text-base">
                            Quiz{" "}
                            <span className="font-bold text-blue-400">
                                "{gameRoom.title}"
                            </span>{" "}
                            berhasil diracik oleh AI.
                        </p>
                        <div className="space-y-2 rounded-xl border border-blue-500/20 bg-[#0b0d1e] p-4">
                            <div className="flex items-center justify-between text-xs md:text-sm">
                                <span className="text-white/50">Materi</span>
                                <span className="ml-2 truncate font-mono text-xs font-semibold capitalize text-white md:text-sm">
                                    {gameRoom.category === "bahasaindonesia"
                                        ? "Bahasa Indonesia"
                                        : gameRoom.category === "bahasainggris"
                                        ? "Bahasa Inggris"
                                        : gameRoom.category}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs md:text-sm">
                                <span className="text-white/50">
                                    Total Soal
                                </span>
                                <span className="font-semibold text-white">
                                    {gameRoom.total_round} Soal
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs md:text-sm">
                                <span className="text-white/50">
                                    Pemain Max
                                </span>
                                <span className="font-semibold text-white">
                                    {gameRoom.max_player} Player
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs md:text-sm">
                                <span className="text-white/50">Kesulitan</span>
                                <span className="rounded bg-blue-600/30 px-2 py-0.5 text-[10px] font-bold capitalize text-blue-300 md:text-xs">
                                    {gameRoom.difficulty}
                                </span>
                            </div>
                        </div>
                    </div>
                ),
                isFailed: false,
                primaryButtonText: "Masuk ke Lobby",
                onPrimaryClick: () => {
                    setToastData((prev) => ({ ...prev, isOpen: false }));
                    router.push(`/quiz-lobby/${gameRoom.game_room_id}`);
                },
            });
        } catch (err: unknown) {
            console.error("[CreateArenaCard] handleSubmitArena error:", err);
            setModalOpen(false);
            setToastData({
                isOpen: true,
                title: "Pembuatan Gagal",
                message:
                    err instanceof Error
                        ? err.message
                        : "Terjadi kesalahan sistem.",
                isFailed: true,
                primaryButtonText: "Tutup",
                onPrimaryClick: () =>
                    setToastData((prev) => ({ ...prev, isOpen: false })),
                secondaryButtonText: "Coba Lagi",
                onSecondaryClick: () => {
                    setToastData((prev) => ({ ...prev, isOpen: false }));
                    setModalOpen(true);
                },
            });
        } finally {
            setIsLoading(false);
            setLoadingText("Memproses...");
            if (aiStatusInterval) clearInterval(aiStatusInterval);
        }
    };

    return (
        <>
            <div className="relative flex h-full min-h-[220px] w-full flex-col justify-center overflow-hidden rounded-3xl bg-[#4D70E8] p-6 text-white shadow-sm md:min-h-[240px] lg:p-8">
                {/* Background Decorative Images */}
                <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-3xl">
                    <div className="absolute right-[-10%] top-0 h-full w-[70%]">
                        <Image
                            src="/dashboard/create-arena-bg-2.webp"
                            alt=""
                            fill
                            sizes="(max-width: 768px) 70vw, 40vw"
                            className="object-top-right object-contain"
                        />
                    </div>

                    <div className="absolute bottom-0 right-0 h-[80%] w-full">
                        <Image
                            src="/dashboard/create-arena-bg-1.webp"
                            alt=""
                            fill
                            sizes="(max-width: 768px) 80vw, 40vw"
                            className="object-bottom-right object-contain"
                        />
                    </div>
                </div>

                {/* Illustration (Karakter orang) */}
                <div className="pointer-events-none absolute right-0 top-1/2 z-20 flex h-[70%] w-[50%] -translate-y-1/2 items-center justify-end pr-2 md:right-[2%] md:h-[80%] md:w-[40%] lg:right-[5%] lg:w-[35%]">
                    <div className="relative h-full w-full">
                        <Image
                            src="/dashboard/create-arena-illust.webp"
                            alt="Create Arena Illustration"
                            fill
                            sizes="(max-width: 768px) 50vw, 35vw"
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-30 flex w-[60%] flex-col items-start pl-1 sm:w-[55%] md:w-[60%] md:pl-2 lg:w-[50%]">
                    <h2 className="mb-2 text-2xl font-extrabold leading-tight tracking-wide drop-shadow-sm md:mb-4 md:text-4xl lg:text-5xl">
                        Buat Arena
                    </h2>
                    <p className="mb-4 max-w-[220px] text-xs font-medium leading-relaxed text-white/95 md:mb-8 md:max-w-[280px] md:text-base">
                        Buat arena kuis dan tantang pemain lain dalam duel
                        pengetahuan
                    </p>
                    <MainButton
                        variant="white"
                        size="sm"
                        hasShadow
                        className="w-max px-4 py-2 text-xs font-extrabold text-[#4D70E8] md:px-6 md:py-2.5 md:text-base"
                        onClick={handleCreateArena}
                    >
                        Buat Arena Baru
                    </MainButton>
                </div>
            </div>

            {/* Modal Overlay */}
            <CreateArenaModal
                open={modalOpen}
                onClose={handleCloseModal}
                onSubmit={handleSubmitArena}
                isLoading={isLoading}
                loadingText={loadingText}
                errorMsg={errorMsg}
            />

            {/* Toast Overlay */}
            <ToastOverlay
                isOpen={toastData.isOpen}
                onClose={() =>
                    setToastData((prev) => ({ ...prev, isOpen: false }))
                }
                title={toastData.title}
                message={toastData.message}
                isFailed={toastData.isFailed}
                primaryButtonText={toastData.primaryButtonText}
                onPrimaryClick={toastData.onPrimaryClick}
                secondaryButtonText={toastData.secondaryButtonText}
                onSecondaryClick={toastData.onSecondaryClick}
            />
        </>
    );
}

export function CreateArenaCardSkeleton() {
    return (
        <div className="relative flex h-full min-h-[220px] w-full flex-col justify-center overflow-hidden rounded-3xl bg-[#4D70E8]/80 p-6 shadow-sm md:min-h-[240px] lg:p-8">
            {/* Background Decor Placeholder */}
            <div className="bg-linear-to-l pointer-events-none absolute right-0 top-0 h-full w-[40%] from-white/10 to-transparent" />

            {/* Content Skeleton */}
            <div className="relative z-30 flex w-[60%] flex-col items-start pl-1 sm:w-[55%] md:w-[60%] md:pl-2 lg:w-[50%]">
                {/* Title */}
                <div className="mb-2 h-8 w-full max-w-[200px] animate-pulse rounded-md bg-white/20 md:mb-4 md:h-12" />

                {/* Description */}
                <div className="mb-4 h-4 w-full max-w-[220px] animate-pulse rounded-md bg-white/20 md:mb-8 md:h-5 md:max-w-[280px]" />
                <div className="-mt-4 mb-4 h-4 w-3/4 max-w-[180px] animate-pulse rounded-md bg-white/20 md:-mt-6 md:mb-8 md:h-5" />

                {/* Button */}
                <div className="h-10 w-32 animate-pulse rounded-full bg-white/30 md:h-12 md:w-40" />
            </div>

            {/* Hero Illustration Placeholder */}
            <div className="pointer-events-none absolute right-[5%] top-1/2 z-20 flex h-[70%] w-[40%] -translate-y-1/2 items-center justify-center md:w-[35%]">
                <div className="h-full w-full animate-pulse rounded-[40%] bg-white/10 blur-sm" />
            </div>
        </div>
    );
}
