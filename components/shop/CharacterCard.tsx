import NextImage from "next/image";
import { cn } from "@/lib/utils/utils";

export type Level = "default" | "epic" | "legend";

export type CardProps = {
    id: string;
    image_url?: string;
    name?: string;
    skin_name?: string;
    cost?: number;
    skin_level?: Level;
    owned?: boolean;
    character_bg?: string;
    onPurchase?: () => void;
};

const LEVEL_COLORS: Record<Level, string> = {
    default: "#4AA213",
    epic: "#7C13A2",
    legend: "#C89B00",
};

export default function CharacterCard({
    image_url,
    name,
    skin_name,
    cost,
    skin_level = "default",
    owned = false,
    character_bg,
    onPurchase,
}: CardProps) {
    let bg: string;
    if (skin_level === "epic") {
        bg = LEVEL_COLORS.epic;
    } else if (skin_level === "legend") {
        bg = LEVEL_COLORS.legend;
    } else {
        bg = character_bg ?? LEVEL_COLORS.default;
    }

    const displayName = skin_name ?? name ?? "Item";

    return (
        <div
            className="sm:aspect-2/3 group relative flex aspect-[2/2.8] w-full select-none flex-col items-center overflow-hidden rounded-xl shadow-lg"
            style={{ backgroundColor: bg }}
        >
            {/* Radial highlight */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_38%,rgba(255,255,255,0.36)_0%,rgba(255,255,255,0)_70%)]"
            />

            {/* Badges */}
            {skin_level !== "default" && (
                <div
                    className={cn(
                        "absolute right-1.5 top-1.5 z-20 flex items-center gap-1 rounded-full px-2 py-0.5 shadow-sm sm:right-2 sm:top-2 sm:px-3 sm:py-1",
                        skin_level === "legend"
                            ? "bg-[#FFE270] text-[#796100]"
                            : "bg-[#ECC5FE] text-[#631D76]",
                    )}
                >
                    <NextImage
                        src={
                            skin_level === "legend"
                                ? "/icons/legend.svg"
                                : "/icons/epic.svg"
                        }
                        width={12}
                        height={12}
                        alt={skin_level}
                        className="h-3 w-3 md:h-4 md:w-4"
                    />
                    <span className="text-[8px] font-bold uppercase leading-none tracking-wide sm:text-[10px] md:text-[11px]">
                        {skin_level}
                    </span>
                </div>
            )}

            {/* Character Image */}
            <div className="relative z-10 flex w-full flex-1 items-center justify-center px-3 pt-4 sm:px-4 sm:pt-6">
                {image_url ? (
                    <div className="relative flex aspect-square w-[75%] items-center justify-center sm:w-[65%]">
                        <NextImage
                            src={image_url}
                            alt={displayName}
                            fill
                            sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 20vw"
                            className="object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-110"
                        />
                    </div>
                ) : (
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                        No Image
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="relative z-10 flex w-full flex-col items-center gap-2 px-3 pb-4 pt-1 sm:gap-4 sm:px-4 sm:pb-5 sm:pt-2">
                <h3 className="w-full truncate text-center text-sm font-bold text-white drop-shadow-md sm:text-lg md:text-xl lg:text-2xl">
                    {displayName}
                </h3>

                {/* Action Button / Owned State */}
                {owned ? (
                    <div className="w-full rounded-md bg-[#172844] py-1.5 text-center text-sm font-bold text-white/90 md:text-base">
                        Dimiliki
                    </div>
                ) : (
                    <button
                        onClick={onPurchase}
                        className="group/btn flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-white py-1.5 shadow-xl transition-all hover:bg-white/95 active:scale-95"
                    >
                        <NextImage
                            src="/icons/coin-color.svg"
                            width={20}
                            height={20}
                            alt="coin"
                            className="h-5 w-5 transition-transform group-hover/btn:rotate-12"
                        />
                        <span className="text-sm font-bold text-gray-800 md:text-lg">
                            {cost != null ? cost.toLocaleString("id-ID") : "—"}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
}
export function CharacterCardSkeleton() {
    return (
        <div className="sm:aspect-2/3 group relative flex aspect-[2/2.8] w-full animate-pulse select-none flex-col items-center overflow-hidden rounded-xl bg-white/5 shadow-lg">
            {/* Radial highlight */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_38%,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0)_70%)]"
            />

            {/* Character Image Placeholder */}
            <div className="relative z-10 flex w-full flex-1 items-center justify-center px-3 pt-4 sm:px-4 sm:pt-6">
                <div className="aspect-square w-[75%] rounded-full bg-white/10 sm:w-[65%]" />
            </div>

            {/* Footer Placeholder */}
            <div className="relative z-10 flex w-full flex-col items-center gap-3 px-3 pb-4 pt-1 sm:gap-4 sm:px-4 sm:pb-5 sm:pt-2">
                <div className="h-4 w-24 rounded bg-white/10 sm:h-5 sm:w-32" />
                <div className="h-8 w-full rounded-md bg-white/10" />
            </div>
        </div>
    );
}
