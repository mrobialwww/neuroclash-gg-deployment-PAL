"use client";

import { useState } from "react";
import { MainButton } from "@/components/common/MainButton";
import { GameRoomCard } from "./GameRoomCard";
import { GameRoomWithPlayerCount } from "@/types/GameRoom";

interface CategorySectionProps {
    title: string;
    rooms: GameRoomWithPlayerCount[];
}

export function CategorySection({ title, rooms }: CategorySectionProps) {
    const [showAll, setShowAll] = useState(false);

    // If rooms <= 4, no need to show the toggle button
    const canShowMore = rooms.length > 4;
    const displayedRooms = showAll ? rooms : rooms.slice(0, 4);

    return (
        <div className="w-full">
            {/* Header section */}
            <div className="mb-4 flex items-center justify-between px-1 md:mb-6">
                <h2 className="text-2xl font-bold text-white md:text-3xl">
                    {title}
                </h2>

                {canShowMore && (
                    <MainButton
                        variant="blue"
                        className="h-auto border-none bg-[#658BFF] px-6 py-2 text-sm shadow-none hover:bg-[#3D79F3] md:text-base"
                        onClick={() => setShowAll(!showAll)}
                    >
                        {showAll ? "Sembunyikan" : "Lihat Lebih"}
                    </MainButton>
                )}
            </div>

            {/* Cards list */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayedRooms.map((room) => (
                    <div
                        key={room.game_room_id}
                        className="flex justify-center"
                    >
                        <GameRoomCard room={room} />
                    </div>
                ))}
            </div>
        </div>
    );
}
