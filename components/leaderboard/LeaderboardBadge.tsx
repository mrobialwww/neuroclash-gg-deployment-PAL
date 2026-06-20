import Image from "next/image";

interface LeaderboardBadgeProps {
    title: string;
}

export function LeaderboardBadge({ title }: LeaderboardBadgeProps) {
    return (
        <div className="absolute -top-8 left-1/2 z-20 flex w-full max-w-[320px] -translate-x-1/2 items-center justify-center px-4 md:max-w-[400px]">
            <div className="relative flex h-auto w-full items-center justify-center">
                <Image
                    src="/dashboard/trophy-badge.webp"
                    alt="Rank Badge Background"
                    width={360}
                    height={68}
                    className="-z-10 block h-full w-full object-contain drop-shadow-sm"
                    sizes="(max-width: 400px) 100vw, 400px"
                    priority
                />
                <div className="absolute inset-0 flex items-center justify-center px-3 sm:px-6">
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-lg font-bold tracking-wide text-white drop-shadow-sm md:text-xl">
                        {title}
                    </span>
                </div>
            </div>
        </div>
    );
}
