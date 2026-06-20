"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/utils";

interface CloseButtonProps {
    onClick: () => void;
    className?: string;
}

export const CloseButton = ({ onClick, className }: CloseButtonProps) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/80 shadow-xl backdrop-blur-sm transition-all hover:scale-110 active:scale-95 md:h-10 md:w-10",
                className,
            )}
        >
            <Image
                src="/icons/cancel.svg"
                alt="Close"
                width={24}
                height={24}
                className="h-4 w-4 transition-transform duration-300 md:h-5 md:w-5"
            />
        </button>
    );
};
