"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/utils";

interface AbilityCardProps {
    name: string;
    image: string;
    emptyImage: string;
    description: string;
    stock: number;
    className?: string;
    onClick?: () => void;
    isLarge?: boolean;
    disableHover?: boolean;
}

export const AbilityCard = ({
    name,
    image,
    emptyImage,
    stock,
    className,
    onClick,
    isLarge = false,
    disableHover = false,
}: AbilityCardProps) => {
    const displayImage = stock > 0 ? image : emptyImage;

    return (
        <div
            className={cn(
                "relative transform transition-all duration-200",
                !disableHover && stock > 0
                    ? "group cursor-pointer hover:-translate-y-1 hover:scale-[1.02] active:scale-95"
                    : "cursor-default",
                stock <= 0 && "opacity-80 grayscale-[0.3]",
                className,
            )}
            onClick={!disableHover && stock > 0 ? onClick : undefined}
        >
            <div className="aspect-412/212 relative w-full drop-shadow-2xl">
                <Image
                    src={displayImage}
                    alt={name}
                    fill
                    sizes={
                        isLarge
                            ? "(max-width: 768px) 100vw, 600px"
                            : "(max-width: 768px) 180px, (max-width: 1024px) 200px, 220px"
                    }
                    className="object-contain"
                    priority={isLarge}
                />

                {/* Stock text in top right corner overlaying the ribbon */}
                <div className="pointer-events-none absolute right-[4%] top-[1.5%] z-10">
                    <div className="flex items-center justify-end">
                        <span
                            className={cn(
                                "font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
                                isLarge
                                    ? "text-xl md:text-3xl"
                                    : "text-sm md:text-base",
                            )}
                        >
                            x{stock}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
