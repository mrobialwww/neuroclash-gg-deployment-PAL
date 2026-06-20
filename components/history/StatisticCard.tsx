import Image from "next/image";
import { cn } from "@/lib/utils/utils";

interface StatisticCardProps {
    label: string;
    value: string | number;
    iconPath: string;
    className?: string;
    iconClassName?: string;
}

export function StatisticCard({
    label,
    value,
    iconPath,
    className,
    iconClassName,
}: StatisticCardProps) {
    return (
        <div
            className={cn(
                "group relative flex min-h-[90px] flex-col justify-between overflow-hidden rounded-xl border border-gray-100 bg-white p-3 shadow-[0_2px_15px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] md:min-h-[120px] md:p-5",
                className,
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <span className="sm:text-md text-sm font-medium tracking-wide text-[#555555] md:text-lg">
                    {label}
                </span>

                <div
                    className={cn(
                        "relative h-8 w-8 shrink-0 transition-opacity md:h-10 md:w-10",
                        iconClassName,
                    )}
                >
                    <Image
                        src={iconPath}
                        alt={label}
                        fill
                        sizes="(max-width: 768px) 32px, 40px"
                        className="object-contain"
                    />
                </div>
            </div>

            <div className="mt-2 md:mt-auto">
                <span className="text-3xl font-extrabold text-[#111111] sm:text-4xl md:text-5xl">
                    {value}
                </span>
            </div>
        </div>
    );
}
