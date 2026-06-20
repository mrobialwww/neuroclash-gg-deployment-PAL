"use client";

import React from "react";
import { cn } from "@/lib/utils/utils";
import { motion, AnimatePresence } from "framer-motion";
import { AbilityCard } from "./AbilityCard";
import { MainButton } from "../common/MainButton";
import { CloseButton } from "./CloseButton";
import { PickedAbility } from "@/store/useStarboxStore";

interface OverlayAbilityCardProps {
    ability: PickedAbility | null;
    isOpen: boolean;
    onClose: () => void;
    onUse: (abilityId: number) => void;
    className?: string;
}

export const OverlayAbilityCard = ({
    ability,
    isOpen,
    onClose,
    onUse,
    className,
}: OverlayAbilityCardProps) => {
    return (
        <AnimatePresence>
            {isOpen && ability && (
                <div className="z-100 fixed inset-0 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Content Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={cn(
                            "relative z-10 flex w-full max-w-[400px] flex-col items-center gap-6",
                            className,
                        )}
                    >
                        {/* Ability Card (Large) */}
                        <div className="w-full">
                            <AbilityCard
                                name={ability.name}
                                image={ability.image}
                                emptyImage={ability.empty_image}
                                description={ability.description}
                                stock={ability.stock}
                                isLarge
                                disableHover
                                className="select-none"
                            />
                        </div>

                        {/* Helper Text */}
                        <p className="md:text-md px-4 text-center text-sm font-medium text-white drop-shadow-md">
                            Kekuatan akan otomatis digunakan pada babak
                            berikutnya
                        </p>

                        {/* Use Button */}
                        {ability.ability_id !== 5 &&
                            ability.ability_id !== 6 && (
                                <MainButton
                                    variant="blue"
                                    size="default"
                                    hasShadow
                                    className="h-10 w-full max-w-xs rounded-full text-lg md:h-12 md:text-xl"
                                    onClick={() => {
                                        onUse(ability.ability_id);
                                        onClose();
                                    }}
                                >
                                    Gunakan
                                </MainButton>
                            )}

                        {/* Close Button below */}
                        <CloseButton onClick={onClose} />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
