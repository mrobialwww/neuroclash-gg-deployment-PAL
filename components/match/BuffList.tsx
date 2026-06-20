"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/utils";
import { BuffItem } from "./BuffItem";
import { OverlayMaterialCard } from "./OverlayMaterialCard";
import { OverlayAbilityCard } from "./OverlayAbilityCard";
import { PickedAbility, useStarboxStore } from "@/store/useStarboxStore";
import { BuffEffectType } from "./BuffEffectOverlay";

interface BuffListProps {
    buffs?: PickedAbility[];
    className?: string;
    onAbilityUsed?: (type: BuffEffectType) => void;
}

export const BuffList = ({
    buffs = [],
    className,
    onAbilityUsed,
}: BuffListProps) => {
    const [selectedMaterial, setSelectedMaterial] =
        useState<PickedAbility | null>(null);
    const [selectedAbility, setSelectedAbility] =
        useState<PickedAbility | null>(null);

    const refreshMyInventory = useStarboxStore((s) => s.refreshMyInventory);
    const decrementLocalStock = useStarboxStore((s) => s.decrementLocalStock);
    const useHeal = useStarboxStore((s) => s.useHeal);

    const handleBuffClick = (buff: PickedAbility) => {
        if (buff.ability_id === 1) {
            setSelectedMaterial(buff);
        } else {
            setSelectedAbility(buff);
        }
    };

    return (
        <>
            <div
                className={cn(
                    "relative flex w-full flex-col items-center rounded-2xl border-2 border-white/10 bg-[#D9D9D9]/20 p-2 shadow-2xl backdrop-blur-md",
                    className,
                )}
            >
                {/* Header Badge */}
                <div className="relative mb-3 flex h-[35px] w-full max-w-[180px] shrink-0 items-center justify-center md:h-[40px]">
                    <Image
                        src="/match/match-badge.webp"
                        alt="Badge"
                        fill
                        sizes="(max-width: 768px) 180px, 200px"
                        className="object-contain"
                        priority
                    />
                    <h2 className="xs:text-xs relative z-10 mt-0.5 text-[10px] font-semibold tracking-tight text-white md:text-base">
                        Materi & Kekuatan
                    </h2>
                </div>

                {/* Buff Grid Container */}
                <div className="scrollbar-hide flex w-full flex-1 flex-col overflow-y-auto pb-2">
                    {buffs.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm font-medium text-white/50">
                            Belum ada materi dan kekuatan yang kamu dapat
                        </div>
                    ) : (
                        <div
                            className="mx-auto grid w-full gap-x-2 gap-y-1"
                            style={{
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(65px, 1fr))",
                            }}
                        >
                            {buffs.map((buff) => {
                                if (buff.stock > 0) {
                                    return (
                                        <BuffItem
                                            key={buff.ability_id}
                                            buff={buff}
                                            onClick={() =>
                                                handleBuffClick(buff)
                                            }
                                        />
                                    );
                                }
                            })}
                        </div>
                    )}
                </div>
            </div>

            <OverlayMaterialCard
                isOpen={!!selectedMaterial}
                onClose={() => setSelectedMaterial(null)}
                title={selectedMaterial?.ability_materials?.title || ""}
                materialName={
                    selectedMaterial
                        ? selectedMaterial?.ability_materials?.title!
                        : ""
                }
                content={
                    selectedMaterial
                        ? selectedMaterial?.ability_materials?.content!
                        : ""
                }
            />

            <OverlayAbilityCard
                isOpen={!!selectedAbility}
                ability={selectedAbility}
                onClose={() => setSelectedAbility(null)}
                onUse={async () => {
                    if (!selectedAbility) return;

                    const { game_room_id, user_id, ability_id } =
                        selectedAbility;

                    if (ability_id === 2) {
                        // Attack: kurangi stock lokal (optimistic), tutup overlay, lalu animasi
                        decrementLocalStock(ability_id);
                        setSelectedAbility(null);
                        onAbilityUsed?.("attack");
                        return;
                    }

                    if (ability_id === 4) {
                        // Shield: kurangi stock lokal (optimistic), tutup overlay, lalu animasi
                        decrementLocalStock(ability_id);
                        setSelectedAbility(null);
                        onAbilityUsed?.("shield");
                        return;
                    }

                    if (ability_id === 3) {
                        // Heal: panggil RPC ke DB, refresh inventory, lalu animasi
                        await useHeal(game_room_id, user_id);
                        await refreshMyInventory(game_room_id, user_id);
                        setSelectedAbility(null);
                        onAbilityUsed?.("heal");
                        return;
                    }

                    // Fallback untuk ability lain yang mungkin ditambah di masa depan
                    await refreshMyInventory(game_room_id, user_id);
                    setSelectedAbility(null);
                }}
            />
        </>
    );
};
