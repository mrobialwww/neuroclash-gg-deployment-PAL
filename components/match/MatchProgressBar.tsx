"use client";

import { cn } from "@/lib/utils/utils";

interface MatchProgressBarProps {
    duration?: number;
    timeLeft: number;
    activeStepIndex?: number;
    isSolo?: boolean;
    className?: string;
}

export function MatchProgressBar({
    duration = 30,
    timeLeft,
    activeStepIndex = 0,
    isSolo = false,
    className,
}: MatchProgressBarProps) {
    const progressPercentage = (timeLeft / duration) * 100;

    const allSteps = [
        { id: "book", icon: "/icons/book.svg" },
        { id: "battle-1", icon: "/icons/battle.svg" },
        { id: "battle-2", icon: "/icons/battle.svg" },
        { id: "battle-3", icon: "/icons/battle.svg" },
        { id: "battle-4", icon: "/icons/battle.svg" },
        { id: "battle-5", icon: "/icons/battle.svg" },
        { id: "treasure", icon: "/icons/treasure.svg" },
    ];

    // Solo: hanya tampilkan 5 ikon battle (tanpa book & treasure)
    // activeStepIndex dari store adalah 1-based (round % 5), jadi battle-N = index N-1
    const steps = isSolo
        ? allSteps.filter((s) => s.id.startsWith("battle"))
        : allSteps;

    const effectiveActiveIndex = isSolo
        ? activeStepIndex - 1 // activeStepIndex=1 → index 0 (battle-1)
        : activeStepIndex;

    return (
        <div
            className={cn(
                "mx-auto w-full max-w-[95%] lg:max-w-[860px]",
                className,
            )}
        >
            <div className="relative flex items-center">
                {/* Track Dasar */}
                <div className="absolute h-3 w-full rounded-full border border-white/40 bg-white/10 backdrop-blur-md md:h-4" />

                {/* Progres Kiri */}
                <div className="pointer-events-none absolute left-0 right-1/2 flex h-full items-center justify-start pr-8 md:pr-11">
                    <div className="flex h-2.5 w-full justify-end overflow-hidden md:h-3">
                        <div
                            className="h-full origin-right rounded-l-full bg-[#FFCB66] transition-all duration-1000 ease-linear"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>

                {/* Progres Kanan */}
                <div className="pointer-events-none absolute left-1/2 right-0 flex h-full items-center justify-start pl-8 md:pl-11">
                    <div className="h-2.5 w-full overflow-hidden md:h-3">
                        <div
                            className="h-full origin-left rounded-r-full bg-[#FFCB66] transition-all duration-1000 ease-linear"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>

                {/* Timer Badge (Pusat) */}
                <div className="relative z-30 mx-auto flex h-6 w-20 items-center justify-center rounded-xl border border-white/40 bg-[#0F111A] shadow-2xl md:h-8 md:w-24 md:rounded-2xl">
                    <span className="text-lg font-bold text-white md:text-xl">
                        {timeLeft}
                    </span>
                </div>
            </div>

            {/* Icons Indicators */}
            <div className="mt-4 flex justify-center gap-2 sm:gap-4 md:gap-6">
                {steps.map((step, index) => {
                    const isActive = index === effectiveActiveIndex;

                    return (
                        <div
                            key={step.id}
                            className="relative flex flex-col items-center"
                        >
                            <div
                                className={cn(
                                    "relative h-4 w-4 transition-all duration-500 md:h-5 md:w-5",
                                    isActive
                                        ? "scale-110 text-[#FFCC00]"
                                        : "scale-100 text-white/40",
                                )}
                            >
                                <div
                                    className="h-full w-full bg-current"
                                    style={{
                                        maskImage: `url(${step.icon})`,
                                        WebkitMaskImage: `url(${step.icon})`,
                                        maskRepeat: "no-repeat",
                                        WebkitMaskRepeat: "no-repeat",
                                        maskSize: "contain",
                                        WebkitMaskSize: "contain",
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
