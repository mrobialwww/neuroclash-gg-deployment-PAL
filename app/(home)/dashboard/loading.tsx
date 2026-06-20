import { GameRoomCardSkeleton } from "@/components/dashboard/GameRoomCard";
import { JoinArenaCardSkeleton } from "@/components/dashboard/JoinArenaCard";
import { CreateArenaCardSkeleton } from "@/components/dashboard/CreateArenaCard";

export default function DashboardLoading() {
    return (
        <main className="mx-auto max-w-[1400px] space-y-8 px-6 py-10 pb-20 md:px-12 lg:px-16">
            {/* Hero Section Skeletons */}
            <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1.5fr]">
                <JoinArenaCardSkeleton />
                <CreateArenaCardSkeleton />
            </div>

            <div className="mt-8 space-y-12">
                {/* Skeleton for a Category Section */}
                {[1, 2].map((categoryIdx) => (
                    <div key={categoryIdx} className="w-full">
                        <div className="mb-4 flex items-center justify-between px-1 md:mb-6">
                            <div className="h-8 w-48 animate-pulse rounded-md bg-gray-200" />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex justify-center">
                                    <GameRoomCardSkeleton />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
