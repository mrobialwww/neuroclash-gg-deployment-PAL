"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { UserCharacterWithDetails } from "@/modules/characters/character.schema";
import { toast } from "sonner";
import { RightSidebar } from "./RightSidebar";
import { useUserStore } from "@/store/useUserStore";

type ShowroomProps = {
    userId: string;
    allCharacters: (UserCharacterWithDetails & { owned: boolean })[];
    loadData: () => Promise<void>;
    onPurchaseClick: (item: any) => void;
};

export default function ShowroomView({
    userId,
    allCharacters,
    loadData,
    onPurchaseClick,
}: ShowroomProps) {
    const [activeTab, setActiveTab] = useState<"character" | "skin">(
        "character",
    );
    const [selectedBase, setSelectedBase] = useState<string>("");
    const [selectedCharId, setSelectedCharId] = useState<number | null>(null);
    const [isEquipping, setIsEquipping] = useState(false);

    const { updateAvatar } = useUserStore();

    // Get all unique owned base characters
    const ownedBases = useMemo(() => {
        return allCharacters.filter(
            (c) => c.skin_level === "default" && c.owned,
        );
    }, [allCharacters]);

    // Sync initial selection
    useEffect(() => {
        if (ownedBases.length > 0 && !selectedBase) {
            const equipped = allCharacters.find(
                (c) => (c as any).is_used && c.owned,
            );
            if (equipped) {
                setSelectedBase(equipped.base_character);
                setSelectedCharId(equipped.character_id);
            } else {
                setSelectedBase(ownedBases[0].base_character);
                setSelectedCharId(ownedBases[0].character_id);
            }
        }
    }, [ownedBases, selectedBase, allCharacters]);

    const selectedItem = useMemo(() => {
        return allCharacters.find((c) => c.character_id === selectedCharId);
    }, [allCharacters, selectedCharId]);

    const skinsForBase = useMemo(() => {
        return allCharacters.filter((c) => c.base_character === selectedBase);
    }, [allCharacters, selectedBase]);

    const handleEquip = async () => {
        if (!selectedCharId || isEquipping) return;
        if (!selectedItem?.owned) return;

        setIsEquipping(true);
        try {
            const res = await fetch(`/api/user-character/${userId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ character_id: selectedCharId }),
                credentials: "include",
            });

            if (!res.ok) throw new Error("Gagal mengenakan karakter");

            // Update avatar global segera
            if (selectedItem.image_url) {
                updateAvatar(
                    selectedItem.image_url,
                    selectedItem.base_character,
                );
            }

            toast.success("Karakter berhasil dikenakan!");
            await loadData();
        } catch (err: any) {
            toast.error(err.message || "Terjadi kesalahan");
        } finally {
            setIsEquipping(false);
        }
    };

    const isCurrentUsed = (selectedItem as any)?.is_used || false;

    return (
        <div className="animate-in fade-in relative flex h-[calc(100dvh-122px)] w-full flex-col overflow-hidden overscroll-none duration-500 md:h-[calc(100dvh-72px)] md:flex-row">
            {/* Center: Hero Showroom */}
            <div className="md:pr-68 relative flex flex-1 flex-col items-center justify-start p-4 pt-6">
                {/* Name Display */}
                <div className="z-20 md:mt-8">
                    <h1 className="text-center text-2xl font-bold tracking-wide text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] md:text-3xl lg:text-4xl">
                        {selectedItem?.skin_name ||
                            selectedItem?.base_character ||
                            "Memuat..."}
                    </h1>
                </div>

                {/* Character Stage */}
                <div className="relative flex aspect-square w-full max-w-[300px] items-center justify-center md:max-w-[360px] lg:max-w-[440px]">
                    {/* Pedestal Layer (Bottom) */}
                    <div className="absolute inset-x-0 bottom-[5%] z-0 h-1/2 w-full">
                        <Image
                            src="/shop/showroom.webp"
                            alt="Pedestal"
                            fill
                            className="scale-180 object-contain object-bottom drop-shadow-2xl"
                            priority
                        />
                    </div>

                    {/* Character Layer (Top) */}
                    <div className="absolute inset-x-0 bottom-0 top-0 z-10 flex items-center justify-center transition-transform duration-500">
                        {selectedItem?.image_url && (
                            <Image
                                src={selectedItem.image_url}
                                alt={
                                    selectedItem.skin_name ||
                                    selectedItem.base_character
                                }
                                fill
                                className="animate-float scale-80 object-contain drop-shadow-[0_20px_40px_rgba(255,255,255,0.3)] filter"
                                priority
                            />
                        )}
                    </div>
                </div>
            </div>

            <RightSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                ownedBases={ownedBases}
                skinsForBase={skinsForBase}
                selectedBase={selectedBase}
                setSelectedBase={setSelectedBase}
                selectedCharId={selectedCharId}
                setSelectedCharId={setSelectedCharId}
                selectedItem={selectedItem}
                isCurrentUsed={isCurrentUsed}
                isEquipping={isEquipping}
                handleEquip={handleEquip}
                onPurchaseClick={onPurchaseClick}
            />
        </div>
    );
}
