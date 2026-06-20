import Image from "next/image";
import { getCharacterBgColor } from "@/lib/constants/characters";

interface LeaderboardAvatarProps {
    imageUrl: string;
    baseCharacter: string;
    size?: "sm" | "md";
}

export function LeaderboardAvatar({
    imageUrl,
    baseCharacter,
    size = "md",
}: LeaderboardAvatarProps) {
    const bgColor = getCharacterBgColor(baseCharacter);
    const sizeClass =
        size === "sm" ? "w-9 h-9 sm:w-10 sm:h-10" : "w-10 h-10 sm:w-12 sm:h-12";

    return (
        <div
            className={`relative ${sizeClass} flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-lg`}
            style={{ backgroundColor: bgColor }}
        >
            <div className="relative flex h-[70%] w-[70%] items-center justify-center">
                <Image
                    src={imageUrl}
                    alt={baseCharacter}
                    fill
                    sizes="48px"
                    className="object-contain drop-shadow-md"
                />
            </div>
        </div>
    );
}
