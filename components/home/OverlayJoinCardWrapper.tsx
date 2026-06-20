"use client";

import { useState } from "react";
import { TextFieldWithButton } from "@/components/common/TextFieldWithButton";
import { ToastOverlay } from "@/components/common/ToastOverlay";
import { OverlayJoinCard } from "@/components/dashboard/OverlayJoinCard";
import { GameRoomWithPlayerCount } from "@/types/GameRoom";

export function OverlayJoinCardWrapper() {
    const [roomToJoin, setRoomToJoin] =
        useState<GameRoomWithPlayerCount | null>(null);
    const [toastData, setToastData] = useState<{
        isOpen: boolean;
        code: string;
    }>({
        isOpen: false,
        code: "",
    });

    const handleJoinByCode = async (code: string) => {
        if (!code) return;

        try {
            const resp = await fetch(`/api/game-rooms/code/${code}`, {
                credentials: "include",
            });
            const result = await resp.json();

            // API contract: { data: GameRoom[] } — ambil elemen pertama
            const rooms = result.data ?? [];
            if (resp.ok && rooms.length > 0) {
                setRoomToJoin({ ...rooms[0], player_count: 0 });
            } else {
                setToastData({ isOpen: true, code });
            }
        } catch (error) {
            console.error("Error joining room:", error);
            setToastData({ isOpen: true, code });
        }
    };

    return (
        <>
            <TextFieldWithButton
                placeholder="Masukkan Kode Arena"
                buttonContent="Gabung"
                wrapperClassName="w-[90%] sm:w-[80%] md:w-full md:max-w-xl"
                className="text-lg md:text-xl"
                onSubmit={handleJoinByCode}
            />

            {roomToJoin && (
                <OverlayJoinCard
                    room={roomToJoin}
                    onClose={() => setRoomToJoin(null)}
                />
            )}

            <ToastOverlay
                isOpen={toastData.isOpen}
                code={toastData.code}
                onClose={() =>
                    setToastData((prev) => ({ ...prev, isOpen: false }))
                }
            />
        </>
    );
}
