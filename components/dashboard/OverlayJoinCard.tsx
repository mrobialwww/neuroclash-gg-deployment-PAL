"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Users, Flag } from "lucide-react";
import { MainButton } from "@/components/common/MainButton";
import { Difficulty } from "@/types";
import { GameRoomWithPlayerCount } from "@/types/GameRoom";
import {
    DIFFICULTY_THEME_MAP,
    getBannerColor,
} from "@/lib/constants/overlay-theme";
import { ToastOverlay } from "@/components/common/ToastOverlay";

interface OverlayJoinCardProps {
    room: GameRoomWithPlayerCount;
    onClose?: () => void;
}

const FALLBACK_IMAGE = "/quiz-category/biologi.webp";

function resolveImage(src: string | null | undefined, error: boolean): string {
    return error || !src ? FALLBACK_IMAGE : src;
}

function OverlayCardContent({ room, onClose }: OverlayJoinCardProps) {
    const router = useRouter();
    const [imgError, setImgError] = useState(false);
    const [loadingAction, setLoadingAction] = useState<
        "join" | "multi" | "solo" | null
    >(null);
    const [errorConfig, setErrorConfig] = useState({
        isOpen: false,
        title: "",
        message: "",
    });

    const displayTitle: string = room.title ?? "";
    const bannerColor = getBannerColor(room.category);
    const difficultyTheme =
        DIFFICULTY_THEME_MAP[room.difficulty as Difficulty] ||
        DIFFICULTY_THEME_MAP["sedang"];

    const handleJoin = () => {
        setLoadingAction("join");
        router.push(`/quiz-lobby/${room.game_room_id}`);
    };

    const handleCreateMulti = async () => {
        setLoadingAction("multi");
        console.log(
            `[OverlayJoinCard] handleCreateMulti START - roomId: ${room.game_room_id}`,
        );

        try {
            const res = await fetch(
                `/api/game-rooms/${room.game_room_id}/duplicate`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        max_player: 40,
                        is_solo: false,
                    }),
                    credentials: "include",
                },
            );
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || "Gagal duplikasi room");
            }
            const newRoom = json.data;
            console.log(`[OverlayJoinCard] ✅ Multi room created:`, newRoom);

            if (!newRoom || !newRoom.game_room_id) {
                throw new Error("Invalid room data returned from API");
            }

            router.push(`/quiz-lobby/${newRoom.game_room_id}`);
        } catch (error) {
            console.error(
                `[OverlayJoinCard] ❌ handleCreateMulti error:`,
                error,
            );
            setErrorConfig({
                isOpen: true,
                title: "Gagal Membuat Room",
                message:
                    "Terjadi kesalahan saat memproses data multiplayer. Silakan coba lagi.",
            });
        } finally {
            if (loadingAction === "multi") setLoadingAction(null);
        }
    };

    const handleSolo = async () => {
        setLoadingAction("solo");
        console.log(
            `[OverlayJoinCard] handleSolo START - roomId: ${room.game_room_id}`,
        );

        try {
            const res = await fetch(
                `/api/game-rooms/${room.game_room_id}/duplicate`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        max_player: 1,
                        is_solo: true,
                    }),
                    credentials: "include",
                },
            );
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || "Gagal duplikasi room");
            }
            const newRoom = json.data;
            console.log(`[OverlayJoinCard] ✅ Solo room created:`, newRoom);

            if (!newRoom || !newRoom.game_room_id) {
                throw new Error("Invalid room data returned from API");
            }

            router.push(`/quiz-lobby/${newRoom.game_room_id}`);
        } catch (error) {
            console.error(`[OverlayJoinCard] ❌ handleSolo error:`, error);
            setErrorConfig({
                isOpen: true,
                title: "Gagal Mode Solo",
                message: "Terjadi kesalahan saat membuat sesi latihan mandiri.",
            });
        } finally {
            if (loadingAction === "solo") setLoadingAction(null);
        }
    };

    return (
        <>
            <div className="font-(family-name:--font-baloo-2) animate-in fade-in zoom-in relative w-full max-w-[400px] overflow-hidden rounded-[24px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] duration-300 md:max-w-[500px]">
                {/* Top Banner Section */}
                <div
                    className={`relative flex h-[200px] items-center justify-center transition-all md:h-[240px] ${bannerColor}`}
                >
                    <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-4 sm:top-4">
                        <button className="flex items-center gap-2 rounded-md bg-black/50 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-md transition-all hover:bg-black/70 sm:text-xs">
                            <Image
                                src="/icons/share.svg"
                                alt="Share"
                                width={14}
                                height={14}
                                className="sm:h-4 sm:w-4"
                            />
                            Bagikan
                        </button>
                        <button
                            onClick={onClose}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-md transition-all hover:bg-black/70 md:h-9 md:w-9"
                        >
                            <Image
                                src="/icons/cancel.svg"
                                alt="Close"
                                width={12}
                                height={12}
                                className="md:h-[14px] md:w-[14px]"
                            />
                        </button>
                    </div>

                    {/* Icon Besar */}
                    <div className="relative flex h-40 w-40 items-center justify-center md:h-48 md:w-48">
                        <Image
                            src={resolveImage(room.image_url, imgError)}
                            alt={displayTitle}
                            width={200}
                            height={200}
                            className="w-[140px] object-contain md:w-[170px]"
                            priority
                            onError={() => setImgError(true)}
                        />
                    </div>
                </div>

                {/* Content Section */}
                <div className="space-y-5 p-6 sm:p-8">
                    <h2 className="text-2xl font-extrabold leading-tight text-[#555555] sm:text-3xl">
                        {displayTitle}
                    </h2>

                    {/* Stats Row */}
                    <div className="flex flex-wrap items-center justify-start gap-4 border-b border-[#D9D9D9] pb-4 sm:gap-6">
                        <div className="flex items-center gap-2 text-[#555555]">
                            <Users size={22} className="text-[#256AF4]" />
                            <span className="text-base font-bold">
                                {room.player_count}/{room.max_player} Pemain
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-[#555555]">
                            <Flag size={20} className="text-[#256AF4]" />
                            <span className="text-base font-bold">
                                {room.total_round} Ronde
                            </span>
                        </div>
                    </div>

                    {/* Difficulty Badge */}
                    <div
                        className={`inline-block rounded-lg px-4 py-1.5 text-sm font-bold capitalize ${difficultyTheme.badgeBg} ${difficultyTheme.badgeText}`}
                    >
                        Tingkat Kesulitan {room.difficulty}
                    </div>

                    {/* Action Button Section with Flat Layout */}
                    <div className="mt-2 w-full pb-2">
                        <div className="flex flex-col gap-3">
                            {/* Tombol 1: Bergabung ke Room */}
                            <MainButton
                                variant="green"
                                hasShadow
                                className="w-full rounded-xl py-2 text-sm font-bold sm:py-4 md:text-lg"
                                onClick={handleJoin}
                                disabled={loadingAction !== null}
                            >
                                {loadingAction === "join"
                                    ? "Memuat..."
                                    : "Bergabung ke Room"}
                            </MainButton>

                            {/* Tombol 2: Buat Room Baru */}
                            <MainButton
                                variant="blue"
                                hasShadow
                                className="w-full rounded-xl py-2 text-sm font-bold sm:py-4 md:text-lg"
                                onClick={handleCreateMulti}
                                disabled={loadingAction !== null}
                            >
                                {loadingAction === "multi"
                                    ? "Memuat..."
                                    : "Buat Room Baru"}
                            </MainButton>

                            {/* Tombol 3: Latihan Mandiri */}
                            <MainButton
                                variant="white"
                                className="w-full cursor-pointer rounded-xl border-2 border-[#3D79F3] py-2 text-sm font-bold sm:py-4 md:text-lg"
                                onClick={handleSolo}
                                disabled={loadingAction !== null}
                            >
                                {loadingAction === "solo"
                                    ? "Memuat..."
                                    : "Latihan Mandiri"}
                            </MainButton>
                        </div>
                    </div>
                </div>
            </div>

            <ToastOverlay
                isOpen={errorConfig.isOpen}
                onClose={() =>
                    setErrorConfig((prev) => ({ ...prev, isOpen: false }))
                }
                title={errorConfig.title}
                message={errorConfig.message}
            />
        </>
    );
}

export function OverlayJoinCard(props: OverlayJoinCardProps) {
    if (typeof document === "undefined") return null;

    return createPortal(
        <div className="z-9999 fixed inset-0 flex items-center justify-center p-5 sm:p-8">
            {/* Overlay Background */}
            <div
                className="animate-in fade-in absolute inset-0 bg-black/60 backdrop-blur-sm duration-300"
                onClick={props.onClose}
            />

            {/* Card Wrapper */}
            <div
                className="z-10 flex w-full justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <OverlayCardContent {...props} />
            </div>
        </div>,
        document.body,
    );
}
