"use client";

import React from "react";
import Image from "next/image";
import { MainButton } from "./MainButton";

interface ToastOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message?: React.ReactNode;
    isFailed?: boolean;
    customImage?: string;
    code?: string;
    primaryButtonText?: string;
    onPrimaryClick?: () => void;
    secondaryButtonText?: string;
    onSecondaryClick?: () => void;
}

export const ToastOverlay = ({
    isOpen,
    onClose,
    title,
    message,
    isFailed = true,
    customImage,
    code,
    primaryButtonText = "OK",
    onPrimaryClick,
    secondaryButtonText,
    onSecondaryClick,
}: ToastOverlayProps) => {
    if (!isOpen) return null;

    const defaultMascot = isFailed
        ? "/mascot/mascot-failed.webp"
        : "/mascot/mascot-match.webp";
    const finalImage = customImage || defaultMascot;
    const titleColor = isFailed
        ? "text-[#FF0000] drop-shadow-[0_2px_4px_rgba(255,0,0,0.3)]"
        : "text-white";

    return (
        <div className="z-100 fixed inset-0 flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm">
            {/* Modal Container */}
            <div className="animate-in fade-in zoom-in-95 relative flex w-full max-w-[400px] flex-col items-center gap-4 rounded-2xl border-2 border-[#383347] bg-[#040619] p-6 text-center shadow-[0_10px_40px_rgba(0,0,0,0.8)] duration-200 md:max-w-[440px] md:gap-6 md:p-8">
                {/* Title */}
                <h2
                    className={`text-xl font-extrabold uppercase md:text-3xl ${titleColor}`}
                >
                    {title || (isFailed ? "Gagal Bergabung" : "Konfirmasi")}
                </h2>

                {/* Mascot / Custom Image */}
                <div className="relative h-[110px] w-[110px] drop-shadow-2xl md:h-[160px] md:w-[160px]">
                    <Image
                        src={finalImage}
                        alt="Toast Display"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>

                {/* Message */}
                <div className="text-sm font-medium leading-relaxed text-white md:text-lg">
                    {message ? (
                        <div>{message}</div>
                    ) : code ? (
                        <>
                            <p>
                                Room dengan kode{" "}
                                <span className="font-bold text-[#FFC300]">
                                    {code}
                                </span>{" "}
                                tidak ditemukan!
                            </p>
                            <p className="block">
                                Pastikan kode arena benar dan masih aktif.
                            </p>
                        </>
                    ) : null}
                </div>

                {/* Action Buttons */}
                <div className="mt-2 flex w-full gap-3">
                    {secondaryButtonText && (
                        <MainButton
                            onClick={onSecondaryClick || onClose}
                            variant="white"
                            size="lg"
                            hasShadow
                            className="h-10 flex-1 text-sm font-semibold md:h-12 md:text-lg"
                        >
                            {secondaryButtonText}
                        </MainButton>
                    )}

                    <MainButton
                        onClick={onPrimaryClick || onClose}
                        variant="blue"
                        size="lg"
                        hasShadow
                        className="h-10 flex-1 text-sm font-semibold md:h-12 md:text-lg"
                    >
                        {primaryButtonText}
                    </MainButton>
                </div>
            </div>
        </div>
    );
};
