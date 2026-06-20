"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { MainButton } from "@/components/common/MainButton";
import { EndgameRewardBadge } from "@/components/endgame/EndgameRewardBadge";
import {
    EndgamePodium,
    PodiumPlayer,
} from "@/components/endgame/EndgamePodium";
import { EndgameTable } from "@/components/endgame/EndgameTable";
import { EndgamePlayer } from "@/components/endgame/EndgameTableRow";
import { useMatchStore } from "@/store/useMatchStore";

export default function EndgamePage({
    params,
}: {
    params: Promise<{ room_id: string }>;
}) {
    const router = useRouter();
    const { currentUser } = useMatchStore();
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const resolvedParams = use(params);
    const roomId = resolvedParams.room_id;

    useEffect(() => {
        async function fetchEndgame() {
            try {
                const res = await fetch(`/api/endgame/${roomId}`);
                const json = await res.json();
                if (json.success && json.data) {
                    setResults(json.data);
                }
            } catch (err) {
                console.error("Failed to fetch endgame data:", err);
            } finally {
                setLoading(false);
            }
        }

        if (roomId) {
            fetchEndgame();
        }
    }, [roomId, currentUser]);

    const currentUserId = currentUser?.id || "unknown";
    const myResult = results.find((r) => r.userId === currentUserId);

    const reward = {
        coinsEarned: myResult?.coinsEarned || 0,
        trophyWon: myResult?.trophyWon || 0,
        coinBoost: myResult?.coinBoost || 0,
        trophyBoost: myResult?.trophyBoost || 0,
    };

    const podiumPlayers: PodiumPlayer[] = results
        .filter((r) => r.placement <= 3)
        .map((r) => ({
            userId: r.userId,
            placement: r.placement,
            username: r.username,
            baseCharacter: r.baseCharacter,
            characterImage: r.characterImage,
        }));

    const tablePlayers: EndgamePlayer[] = results.map((r) => {
        let formattedPlayTime = "-";
        if (r.survivalTime) {
            const parts = r.survivalTime.split(":");
            if (parts.length === 2) {
                const mins = parseInt(parts[0]);
                const secs = parseInt(parts[1]);
                formattedPlayTime = `${mins} Menit ${secs} Detik`;
            } else {
                formattedPlayTime = r.survivalTime;
            }
        } else if (r.isAlive) {
            formattedPlayTime = "Bertahan";
        }

        return {
            id: r.userId,
            position: r.placement,
            username: r.username,
            baseCharacter: r.baseCharacter,
            characterImage: r.characterImage,
            playTime: formattedPlayTime,
            wins: r.win || 0,
            losses: r.lose || 0,
        };
    });

    if (loading) {
        return (
            <main className="flex min-h-screen w-full items-center justify-center">
                <p className="animate-pulse text-xl text-white">
                    Menghitung hasil pertandingan...
                </p>
            </main>
        );
    }

    return (
        <main className="relative flex min-h-screen w-full flex-col items-center overflow-x-hidden px-4 py-6 sm:px-8 md:px-12">
            {/* HEADER SECTION */}
            <header className="relative z-20 mb-4 flex w-full max-w-7xl flex-col items-center gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-0 md:mb-12">
                {/* Buttons first on mobile, but second in order on desktop */}
                <div className="order-1 flex w-full justify-center sm:order-2 sm:w-auto sm:justify-end">
                    <MainButton
                        variant="white"
                        className="h-8 cursor-pointer px-4 text-sm font-bold md:text-base lg:h-10 lg:text-lg"
                        onClick={() => router.push("/dashboard")}
                    >
                        Kembali ke Dashboard
                    </MainButton>
                </div>

                {/* Reward second on mobile, but first on desktop */}
                <div className="order-2 sm:order-1">
                    <EndgameRewardBadge
                        coinsEarned={reward.coinsEarned}
                        trophyWon={reward.trophyWon}
                        coinBoost={reward.coinBoost}
                        trophyBoost={reward.trophyBoost}
                    />
                </div>
            </header>

            {/* PODIUM SECTION */}
            <div className="relative z-10 mb-4 mt-28 w-full max-w-6xl sm:mt-24 lg:mt-12">
                <EndgamePodium players={podiumPlayers} />
            </div>

            {/* TABLE SECTION */}
            <div className="relative z-20 -mt-32 mb-8 w-full max-w-5xl sm:-mt-48 md:-mt-56 lg:-mt-64">
                <EndgameTable
                    players={tablePlayers}
                    currentUserId={currentUserId}
                />
            </div>
        </main>
    );
}
