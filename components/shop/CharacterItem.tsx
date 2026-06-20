"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/utils";
import { getCharacterBgColor } from "@/lib/constants/characters";

type Props = {
    id: number;
    name: string;
    image_url: string;
    base_character: string;
    skin_level?: string;
    owned?: boolean;
    isSelected: boolean;
    onClick: () => void;
};

export const CharacterItem = ({
    name,
    image_url,
    base_character,
    skin_level = "default",
    owned = true,
    isSelected,
    onClick,
}: Props) => {
    const bgColor =
        skin_level === "epic"
            ? "#7C13A2"
            : skin_level === "legend"
            ? "#C89B00"
            : getCharacterBgColor(base_character);

    return (
        <button
            onClick={onClick}
            className="group flex w-full flex-col items-center gap-1"
        >
            <div
                className={cn(
                    "w-18 h-18 md:w-22 md:h-22 border-3 relative flex items-center justify-center overflow-hidden rounded-full border-white transition-colors",
                    isSelected ? "shadow-[0_0_20px_8px_#FDA928]" : "shadow-lg",
                )}
                style={{ backgroundColor: bgColor }}
            >
                {/* Character Image container */}
                <div className="relative flex h-[70%] w-[70%] items-center justify-center">
                    <Image
                        src={image_url}
                        alt={name}
                        fill
                        sizes="80px"
                        className="object-contain drop-shadow-md"
                    />
                </div>

                {/* Overlays (Locked) */}
                {!owned && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-[#161616]/50">
                        <Image
                            src="/icons/lock.svg"
                            alt="Locked"
                            width={32}
                            height={32}
                            className="h-8 w-8 text-white"
                        />
                    </div>
                )}
            </div>
            <span className="mt-1 w-full truncate px-1 text-center text-sm font-bold text-white md:text-base">
                {name}
            </span>
        </button>
    );
};
