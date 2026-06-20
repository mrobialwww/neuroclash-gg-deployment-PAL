"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CloseButton } from "./CloseButton";

interface OverlayMaterialCardProps {
    title: string;
    materialName: string;
    content: string;
    isOpen: boolean;
    onClose: () => void;
    className?: string;
}

export const OverlayMaterialCard = ({
    title,
    materialName,
    content,
    isOpen,
    onClose,
    className,
}: OverlayMaterialCardProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="z-100 fixed inset-0 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Card Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={cn(
                            "relative z-10 flex w-full max-w-2xl flex-col items-center gap-6",
                            className,
                        )}
                    >
                        {/* The Main Card */}
                        <div className="relative w-full overflow-visible rounded-[32px] border border-[#FDA928] bg-black/50 p-6 pt-10 shadow-2xl backdrop-blur-xl">
                            {/* Badge Title */}
                            <div className="absolute -top-5 left-1/2 z-20 flex w-full max-w-[320px] -translate-x-1/2 items-center justify-center px-4">
                                <div className="relative flex h-auto w-full items-center justify-center">
                                    <Image
                                        src="/dashboard/trophy-badge.webp"
                                        alt="Rank Badge Background"
                                        width={320}
                                        height={60}
                                        className="-z-10 block h-full w-full object-contain drop-shadow-sm"
                                        sizes="(max-width: 320px) 100vw, 320px"
                                        priority
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center px-3 sm:px-6">
                                        <span className="text-md overflow-hidden text-ellipsis whitespace-nowrap font-semibold uppercase text-white drop-shadow-sm md:text-lg">
                                            {title}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Internal Content Container */}
                            <div className="mt-2 flex flex-col gap-4">
                                {/* Material Name Box */}
                                <div className="w-full rounded-xl border border-white/10 bg-[#D9D9D9]/10 p-4 backdrop-blur-md">
                                    <h3 className="text-base font-bold text-white md:text-lg">
                                        {materialName}
                                    </h3>
                                </div>

                                {/* Content Box */}
                                <div className="scrollbar-hide max-h-[60vh] w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#D9D9D9]/10 p-6 backdrop-blur-md md:p-8">
                                    <div className="space-y-4 whitespace-pre-wrap text-sm leading-relaxed text-white/90 md:text-base">
                                        {content}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Close Button below the card */}
                        <CloseButton onClick={onClose} />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
