"use client";

import { cn } from "@/lib/utils/utils";

interface Option {
    id: string;
    label: string;
    text: string;
}

interface QuestionCardProps {
    question: string;
    options: Option[];
    onSelect?: (optionId: string) => void;
    selectedId?: string | null;
    disabled?: boolean;
    canAnswer?: boolean | (() => boolean);
    firstAnswerPlayerId?: string | null;
    firstAnswerId?: string | null;
    /** ID of the correct answer — revealed after answering (Solo mode) */
    correctAnswerId?: string | null;
    /** Whether the last answer was correct (Solo mode) — null means not yet answered */
    lastAnswerCorrect?: boolean | null;
    className?: string;
}

export const QuestionCard = ({
    question,
    options,
    onSelect,
    selectedId,
    disabled = false,
    canAnswer = true,
    firstAnswerPlayerId,
    firstAnswerId,
    correctAnswerId,
    lastAnswerCorrect,
    className,
}: QuestionCardProps) => {
    const canUserAnswer =
        typeof canAnswer === "function" ? canAnswer() : canAnswer;

    // Whether we should show the correct/wrong reveal (Solo mode)
    const shouldReveal =
        selectedId !== null &&
        selectedId !== undefined &&
        lastAnswerCorrect !== null &&
        lastAnswerCorrect !== undefined;

    const optionColors: Record<string, string> = {
        A: "text-[#3B82F6] border-[#3B82F6]",
        B: "text-[#EAB308] border-[#EAB308]",
        C: "text-[#22C55E] border-[#22C55E]",
        D: "text-[#A855F7] border-[#A855F7]",
    };

    const optionBgColors: Record<string, string> = {
        A: "bg-[#3B82F6]/20",
        B: "bg-[#EAB308]/20",
        C: "bg-[#22C55E]/20",
        D: "bg-[#A855F7]/20",
    };

    const getButtonStyle = (option: Option) => {
        const isSelected = selectedId === option.id;
        const isCorrect = correctAnswerId === option.id;
        const isFirstAnswer = firstAnswerId === option.id;

        // Solo reveal mode
        if (shouldReveal) {
            if (isCorrect) {
                // Always highlight correct answer in green
                return "border-[#008130] bg-[#008130]/30 scale-[1.02]";
            }
            if (isSelected && !lastAnswerCorrect) {
                // Selected but wrong
                return "border-[#B40000] bg-[#B40000]/30 scale-[1.02]";
            }
            // Other options fade out
            return "border-white/10 opacity-40 cursor-not-allowed";
        }

        // Multiplayer / normal logic
        if (isFirstAnswer) return "border-yellow-400 bg-yellow-400/20";
        if (isSelected) return "scale-[1.02] border-white/60 bg-white/10";

        const isDisabled =
            disabled ||
            !canUserAnswer ||
            (!!selectedId && selectedId !== option.id);
        if (isDisabled) return "cursor-not-allowed border-white/10 opacity-50";

        return "border-white/10 hover:border-white/40";
    };

    return (
        <div
            className={cn(
                "relative isolate z-0 -m-2 mx-auto flex w-full max-w-4xl flex-col gap-4 overflow-hidden p-2 lg:gap-6",
                className,
            )}
        >
            {/* Main Question Box */}
            <div
                className={cn(
                    "relative rounded-2xl border border-white/10 bg-[#D9D9D9]/20 p-6 shadow-lg backdrop-blur-md md:p-10 lg:p-12",
                    "flex items-center justify-center text-center",
                    "min-h-[120px] md:min-h-[180px] lg:min-h-[220px]",
                )}
            >
                <h2 className="text-lg font-semibold leading-relaxed tracking-tight text-white md:text-xl lg:text-3xl">
                    {question}
                </h2>
            </div>

            {/* Options Grid */}
            <div className="grid shrink-0 grid-cols-1 gap-3 md:grid-cols-2 lg:gap-6">
                {options.map((option) => {
                    const isLongText = option.text.length > 50;
                    const isFirstAnswer = firstAnswerId === option.id;
                    const isDisabled =
                        shouldReveal ||
                        disabled ||
                        !canUserAnswer ||
                        (!!selectedId && selectedId !== option.id);

                    return (
                        <button
                            key={option.id}
                            onClick={() => onSelect?.(option.id)}
                            disabled={isDisabled}
                            className={cn(
                                "group relative flex items-center rounded-2xl p-4 lg:p-6",
                                "border-2 bg-[#D9D9D9]/20 backdrop-blur-md transition-colors",
                                "min-h-[70px] md:min-h-[100px] lg:min-h-[140px]",
                                "outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                                getButtonStyle(option),
                            )}
                        >
                            {/* Label Circle (A, B, C, D) */}
                            <div
                                className={cn(
                                    "absolute left-3 top-1/2 -translate-y-1/2 lg:left-4 lg:top-4 lg:translate-y-0",
                                    "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold lg:h-8 lg:w-8 lg:text-sm",
                                    optionColors[option.label],
                                    optionBgColors[option.label],
                                    isFirstAnswer &&
                                        "border-yellow-400 bg-white text-yellow-400",
                                )}
                            >
                                {option.label}
                                {isFirstAnswer && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-[8px] lg:text-[10px]">
                                            ✓
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Option Text */}
                            <div className="w-full px-8 text-center lg:px-6">
                                <span
                                    className={cn(
                                        "block font-medium leading-tight text-white",
                                        isLongText
                                            ? "text-xs md:text-sm lg:text-base"
                                            : "text-sm md:text-lg lg:text-xl",
                                    )}
                                >
                                    {option.text}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
