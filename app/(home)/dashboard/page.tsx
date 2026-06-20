import { CreateArenaCard } from "@/components/dashboard/CreateArenaCard";
import { JoinArenaCard } from "@/components/dashboard/JoinArenaCard";
import { CategorySection } from "@/components/dashboard/CategorySection";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { userService } from "@/modules/users/user.service";
import { Suspense } from "react";
import { GameRoomCardSkeleton } from "@/components/dashboard/GameRoomCard";
import { gameRoomService } from "@/modules/games/game.service";

export const dynamic = "force-dynamic";

export default async function DashboardPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/signin");
    }

    // Fetch Dashboard Stats via Server Service (bypassing slow HTTP calls and avoiding hardcoded URLs)
    const dashboardData = await userService.getDashboardData(user.id);

    if (!dashboardData) {
        throw new Error("Failed to load user dashboard data");
    }

    const searchParamRaw = (await props.searchParams)?.search;
    const searchQuery =
        typeof searchParamRaw === "string" ? searchParamRaw : undefined;

    return (
        <main className="mx-auto max-w-[1400px] space-y-8 px-6 py-10 pb-20 md:px-12 lg:px-16">
            {/* Hero Section */}
            <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1.5fr]">
                <JoinArenaCard
                    rankName={dashboardData?.rankName || "Bronze"}
                    rankScore={dashboardData?.trophy || 0}
                    rankImageUrl={
                        dashboardData?.rankImageUrl || "/rank/bronze.webp"
                    }
                />
                <CreateArenaCard />
            </div>

            <div className="space-y-12">
                <Suspense fallback={<GameRoomsSkeleton />}>
                    <GameRoomsList userId={user.id} searchQuery={searchQuery} />
                </Suspense>
            </div>
        </main>
    );
}

async function GameRoomsList({
    userId,
    searchQuery,
}: {
    userId: string;
    searchQuery?: string;
}) {
    // Fetch public game rooms using gameRoomRepository (which also injects precise player counts)
    // Fetch user's personal created rooms for "Arena Kamu"
    let [rooms, userRooms] = await Promise.all([
        gameRoomService.getPublicOpenRooms(),
        gameRoomService.getUserRooms(userId),
    ]);

    // Apply search filtering if 'search' query exists
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        rooms = rooms.filter(
            (room) =>
                room.title?.toLowerCase().includes(query) ||
                room.category?.toLowerCase().includes(query),
        );
        userRooms = userRooms.filter(
            (room) =>
                room.title?.toLowerCase().includes(query) ||
                room.category?.toLowerCase().includes(query),
        );
    }

    // Group rooms by category
    const groupedRooms = rooms.reduce((acc: any[], room: any) => {
        const existing = acc.find((g) => g.topic === room.category);
        if (existing) {
            existing.rooms.push(room);
        } else {
            acc.push({ topic: room.category, rooms: [room] });
        }
        return acc;
    }, []);

    // Helper formatting for category titles
    const formatTopicTitle = (topic: string) => {
        const t = topic.toLowerCase();
        if (t === "bahasaindonesia") return "Bahasa Indonesia";
        if (t === "bahasainggris") return "Bahasa Inggris";
        return topic.charAt(0).toUpperCase() + topic.slice(1);
    };

    return (
        <>
            {/* User's Created Arenas Section */}
            {userRooms.length > 0 && (
                <CategorySection
                    key="arena-kamu"
                    title="Arena Kamu"
                    rooms={userRooms}
                />
            )}

            {/* Categories Section (Public) */}
            {groupedRooms.map((group: any) => {
                // Filter to ensure only public rooms are shown in categorized sections
                const publicRooms = group.rooms; // (sudah difilter di atas dengan .eq(room_visibility, public))

                if (publicRooms.length === 0) return null;

                return (
                    <CategorySection
                        key={group.topic}
                        title={formatTopicTitle(group.topic)}
                        rooms={publicRooms}
                    />
                );
            })}
        </>
    );
}

function GameRoomsSkeleton() {
    return (
        <>
            {[1, 2].map((categoryIdx) => (
                <div key={categoryIdx} className="w-full space-y-4">
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
        </>
    );
}
