"use client";

import Image from "next/image";
import { getCharacterBgColor } from "@/lib/constants/characters";
import { cn } from "@/lib/utils/utils";
import { MockUser as User } from "@/types/MockUser";

interface AvatarCirclesProps {
    items: User[];
    className?: string;
    avatarSize?: number;
    maxItems?: number;
}

export const AvatarCircles = ({
    items,
    className,
    avatarSize = 48,
    maxItems = 4,
}: AvatarCirclesProps) => {
    if (!items || items.length === 0) return null;

    return (
        <div className={cn("flex flex-row items-center", className)}>
            {items.slice(0, maxItems).map((item, idx) => (
                <div
                    className="group relative -mr-4 transition-all duration-300 last:mr-0 hover:z-30 md:-mr-3"
                    key={item.id}
                >
                    <div
                        className="relative flex items-center justify-center overflow-hidden rounded-full border-[2.5px] border-white shadow-sm"
                        style={{
                            backgroundColor: getCharacterBgColor(
                                item.character,
                            ),
                            width: avatarSize,
                            height: avatarSize,
                        }}
                    >
                        <div className="relative mt-0.5 flex h-[85%] w-[85%] items-center justify-center">
                            <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                sizes={`${avatarSize}px`}
                                className="object-contain"
                                priority={idx < 2} // Optimasi LCP untuk 2 avatar pertama
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
