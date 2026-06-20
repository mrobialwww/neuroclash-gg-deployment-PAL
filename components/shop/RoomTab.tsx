"use client";

import { cn } from "@/lib/utils/utils";

type Props = {
    activeTab: "character" | "skin";
    onChange: (tab: "character" | "skin") => void;
};

export const RoomTab = ({ activeTab, onChange }: Props) => {
    return (
        <div className="flex w-full shrink-0 justify-center p-4 pt-6">
            <div className="flex w-full max-w-[320px] rounded-md bg-[#3865AF] shadow-inner">
                <button
                    onClick={() => onChange("character")}
                    className={cn(
                        "flex h-10 flex-1 items-center justify-center rounded-md transition-all duration-300",
                        activeTab === "character"
                            ? "bg-[#6AA2FF] text-white shadow-md"
                            : "text-white/60 hover:text-white",
                    )}
                >
                    <div className="relative h-6 w-6 md:h-7 md:w-7">
                        <div
                            className="h-full w-full bg-current transition-colors duration-300"
                            style={{
                                maskImage: `url(/icons/character.svg)`,
                                WebkitMaskImage: `url(/icons/character.svg)`,
                                maskRepeat: "no-repeat",
                                WebkitMaskRepeat: "no-repeat",
                                maskSize: "contain",
                                WebkitMaskSize: "contain",
                            }}
                        />
                    </div>
                </button>
                <button
                    onClick={() => onChange("skin")}
                    className={cn(
                        "flex h-10 flex-1 items-center justify-center rounded-md transition-all duration-300",
                        activeTab === "skin"
                            ? "bg-[#6AA2FF] text-white shadow-md"
                            : "text-white/60 hover:text-white",
                    )}
                >
                    <div className="relative h-6 w-6 md:h-7 md:w-7">
                        <div
                            className="h-full w-full bg-current transition-colors duration-300"
                            style={{
                                maskImage: `url(/icons/skin.svg)`,
                                WebkitMaskImage: `url(/icons/skin.svg)`,
                                maskRepeat: "no-repeat",
                                WebkitMaskRepeat: "no-repeat",
                                maskSize: "contain",
                                WebkitMaskSize: "contain",
                            }}
                        />
                    </div>
                </button>
            </div>
        </div>
    );
};
