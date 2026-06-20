import Image from "next/image";

interface LeaderboardRankCellProps {
    position: number;
}

export function LeaderboardRankCell({ position }: LeaderboardRankCellProps) {
    if (position === 1) {
        return (
            <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14 md:h-[60px] md:w-[60px]">
                <Image
                    src="/leaderboard/first.webp"
                    alt="1st Place"
                    width={60}
                    height={60}
                    className="h-full w-full object-contain drop-shadow-lg"
                />
            </div>
        );
    }
    if (position === 2) {
        return (
            <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14 md:h-[60px] md:w-[60px]">
                <Image
                    src="/leaderboard/second.webp"
                    alt="2nd Place"
                    width={60}
                    height={60}
                    className="h-full w-full object-contain drop-shadow-lg"
                />
            </div>
        );
    }
    if (position === 3) {
        return (
            <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14 md:h-[60px] md:w-[60px]">
                <Image
                    src="/leaderboard/third.webp"
                    alt="3rd Place"
                    width={60}
                    height={60}
                    className="h-full w-full object-contain drop-shadow-lg"
                />
            </div>
        );
    }

    return (
        <span className="text-lg font-medium leading-none text-white md:text-xl">
            {position}
        </span>
    );
}
