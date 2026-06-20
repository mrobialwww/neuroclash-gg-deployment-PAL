import { create } from "zustand";
import { getCurrentUserNavbarData } from "@/hooks/useUserClient";
import { LobbyPlayer } from "@/components/quiz/Lobby";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface RoomData {
    game_room_id: string;
    room_code: string;
    max_player: number;
    user_id: string;
    title: string | null;
    topic_material: string;
}

export interface QuizLobbyState {
    roomData: RoomData | null;
    participants: LobbyPlayer[];
    isLoading: boolean;
    isSolo: boolean;
    isHost: boolean;
    participantsCount: number;
    maxPlayers: number;
    error: string | null;
    currentUser: { id: string; username: string; avatar: string } | null;
    isMigrating: boolean;

    loadLobbyData: (roomId: string) => Promise<void>;
    decrementTimer: () => void;
    setError: (msg: string) => void;
    setParticipants: (p: LobbyPlayer[]) => void;

    // Presence & Migration actions
    subscribeToPresence: (roomId: string) => void;
    unsubscribeFromPresence: () => void;
}

let pendingJoinPromise: Promise<void> | null = null;
let lobbyChannel: RealtimeChannel | null = null;
let isSubscribed = false;
let currentRoomId: string | null = null;

export const useQuizLobbyStore = create<QuizLobbyState>((set, get) => ({
    roomData: null,
    participants: [],
    isLoading: true,
    isSolo: false,
    isHost: false,
    participantsCount: 0,
    maxPlayers: 1,
    error: null,
    currentUser: null,
    isMigrating: false,

    setError: (msg: string) => set({ error: msg, isLoading: false }),
    setParticipants: (participants: LobbyPlayer[]) =>
        set({ participants, participantsCount: participants.length }),

    loadLobbyData: async (roomId: string) => {
        set({ isLoading: true, error: null });

        try {
            // 1. Get current user
            const currentUser = await getCurrentUserNavbarData();
            if (!currentUser) {
                set({ error: "Unauthorized", isLoading: false });
                return;
            }
            set({ currentUser });

            // 2. Fetch Lobby Data
            const lobbyRes = await fetch(`/api/game-rooms/${roomId}/lobby`, {
                credentials: "include",
            });
            let lobbyData = lobbyRes.ok ? (await lobbyRes.json()).data : null;
            if (!lobbyData || !lobbyData.roomData) {
                set({ error: "Gagal memuat room.", isLoading: false });
                return;
            }

            // If user not in participants, try to joining
            const isParticipant = lobbyData.participants.some(
                (p: any) => p.user_id === currentUser.id,
            );
            if (!isParticipant) {
                if (!pendingJoinPromise) {
                    pendingJoinPromise = fetch(`/api/user-game/join-room-code`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                            game_room_id: roomId,
                            user_id: currentUser.id,
                        }),
                    }).then(() => {});
                }
                try {
                    await pendingJoinPromise;
                } finally {
                    pendingJoinPromise = null;
                }

                // re-fetch lobby data to get updated user_game list
                const reLobbyRes = await fetch(`/api/game-rooms/${roomId}/lobby`, {
                    credentials: "include",
                });
                lobbyData = reLobbyRes.ok ? (await reLobbyRes.json()).data : null;
                if (!lobbyData) {
                    set({ error: "Gagal memuat room.", isLoading: false });
                    return;
                }
            }

            const rd = lobbyData.roomData as any;

            const isHost = rd.user_id === currentUser.id;
            const isSolo = rd.max_player === 1;

            // 3. Resolve participant user info in client side
            const rawParticipants = lobbyData.participants as any[];
            const playerPromises = rawParticipants.map(async (raw) => {
                try {
                    // Fetch info User & Karakter secara paralel (tanpa cache agar avatar selalu fresh)
                    const [userRes, charRes] = await Promise.all([
                        fetch(`/api/users/${raw.user_id}`, {
                            cache: "no-store",
                            credentials: "include",
                        }),
                        fetch(
                            `/api/user-character/${raw.user_id}?is_used=true`,
                            {
                                cache: "no-store",
                                credentials: "include",
                            },
                        ),
                    ]);

                    const userResult = await userRes.json();
                    const userData = Array.isArray(userResult.data)
                        ? userResult.data[0]
                        : userResult.data;

                    let characterData = null;
                    if (charRes.ok) {
                        const charResult = await charRes.json();
                        characterData = Array.isArray(charResult.data)
                            ? charResult.data[0]
                            : charResult.data;
                    }

                    return {
                        id: String(raw.user_id),
                        name: userData?.username || "Pemain",
                        character: characterData?.base_character || "Slime",
                        image:
                            characterData?.image_url || "/default/Slime.webp",
                        health: 100,
                        maxHealth: 100,
                        userGameId: String(raw.user_game_id),
                        joinedAt: String(raw.created_at),
                    } as LobbyPlayer;
                } catch (err) {
                    console.error("Gagal resolving player:", err);
                    return null;
                }
            });

            const resolved = await Promise.all(playerPromises);
            const participants = resolved.filter(
                (p): p is LobbyPlayer => p !== null,
            );

            set({
                roomData: {
                    game_room_id: rd.game_room_id,
                    room_code: rd.room_code,
                    max_player: rd.max_player,
                    user_id: rd.user_id,
                    title: rd.title,
                    topic_material: rd.topic_material,
                },
                participants,
                participantsCount: participants.length,
                maxPlayers: rd.max_player,
                isHost,
                isSolo,
                isLoading: false,
            });
        } catch (err: any) {
            console.error(err);
            set({
                error: err.message || "Gagal memuat lobby data",
                isLoading: false,
            });
        }
    },

    decrementTimer: () => {
        // Implement countdown if host starts the match
    },

    subscribeToPresence: (roomId: string) => {
        console.log(
            `[LobbyStore] subscribeToPresence START - roomId: ${roomId}, currentRoomId: ${currentRoomId}`,
        );

        const { currentUser, participants } = get();
        if (!currentUser) {
            console.log(
                "[LobbyStore] ❌ No current user, skipping subscription",
            );
            return;
        }

        // Cek apakah room berubah, jika berbeda unsubscribe dulu
        if (currentRoomId && currentRoomId !== roomId) {
            console.log(
                `[LobbyStore] 🔄 Room changed from ${currentRoomId} to ${roomId}`,
            );
            if (lobbyChannel) {
                console.log(
                    `[LobbyStore] Unsubscribing from old channel ${currentRoomId}`,
                );
                try {
                    const supabase = createClient();
                    supabase.removeChannel(lobbyChannel);
                } catch (err) {
                    console.error(
                        "[LobbyStore] Error removing old channel:",
                        err,
                    );
                }
            }
            lobbyChannel = null;
            isSubscribed = false;
        }

        // Jangan subscribe ulang jika sudah subscribe ke room yang sama
        if (
            lobbyChannel &&
            (isSubscribed || lobbyChannel.state === "joined") &&
            currentRoomId === roomId
        ) {
            console.log(
                `[LobbyStore] ⚠️ Already subscribed to room ${roomId}, skipping...`,
            );
            return;
        }

        // Set current room ID sebelum subscribe
        currentRoomId = roomId;
        console.log(`[LobbyStore] 📍 Setting currentRoomId to: ${roomId}`);

        const supabase = createClient();

        // Clean up if channel exists but somehow not subscribed properly
        if (lobbyChannel) {
            supabase.removeChannel(lobbyChannel);
            lobbyChannel = null;
        }
        const channel = supabase.channel(`lobby:${roomId}`, {
            config: { presence: { key: currentUser.id } },
        });

        const myPlayerPayload = participants.find(
            (p) => p.id === currentUser.id,
        );
        console.log("[LobbyStore] My player payload:", myPlayerPayload);

        // Presence sync - update player list saat player join/leave
        channel
            .on("presence", { event: "sync" }, async () => {
                console.log("[LobbyStore] Presence sync event fired");
                const state = channel.presenceState();
                const activePresenceIds = Object.keys(state);
                console.log(
                    "[LobbyStore] Active presence IDs:",
                    activePresenceIds,
                );

                // 1. Update UI List based on Online Status
                const activeUsersList = Object.values(state).flatMap(
                    (s) => s,
                ) as any[];
                const uniquePresencePlayers = new Map();
                for (const p of activeUsersList) {
                    if (p?.id) uniquePresencePlayers.set(p.id, p);
                }
                const { setParticipants } = get();
                setParticipants(Array.from(uniquePresencePlayers.values()));

                // 2. Automated Host Migration Logic
                const { roomData } = get();
                if (!roomData) return;

                const isCurrentHostOnline = activePresenceIds.includes(
                    roomData.user_id,
                );

                if (!isCurrentHostOnline && !get().isMigrating) {
                    // Elect new host: The most senior (earliest joinedAt) active participant
                    const onlineParticipants = get().participants.filter((p) =>
                        activePresenceIds.includes(String(p.id)),
                    );

                    if (onlineParticipants.length === 0) return;

                    const newHostCandidate = [...onlineParticipants].sort(
                        (a, b) => {
                            const timeA = new Date(a.joinedAt || 0).getTime();
                            const timeB = new Date(b.joinedAt || 0).getTime();
                            return timeA - timeB;
                        },
                    )[0];

                    // Only the candidate triggers the update to avoid collisions
                    if (newHostCandidate.id === currentUser.id) {
                        console.log(
                            "[Migration] Electing NEW Host:",
                            currentUser.username,
                        );
                        set({ isMigrating: true });
                        const res = await fetch(
                            `/api/game-rooms/${roomId}/migrate`,
                            {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    new_host_id: currentUser.id,
                                }),
                                credentials: "include",
                            },
                        );
                        const success = res.ok;
                        if (success) {
                            set({
                                roomData: {
                                    ...roomData,
                                    user_id: currentUser.id,
                                },
                                isHost: true,
                                isMigrating: false,
                            });
                        } else {
                            set({ isMigrating: false });
                        }
                    }
                }
            })
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "game_rooms",
                    filter: `game_room_id=eq.${roomId}`,
                },
                (payload: any) => {
                    console.log(
                        `[LobbyStore] 📡 postgres_changes event received!`,
                    );
                    console.log(`[LobbyStore] Event: UPDATE`);
                    console.log(`[LobbyStore] Table: game_rooms`);
                    console.log(
                        `[LobbyStore] Filter: game_room_id=eq.${roomId}`,
                    );
                    console.log(
                        `[LobbyStore] Payload:`,
                        JSON.stringify(payload, null, 2),
                    );

                    // Real-time UI Sync for Host Label
                    const { roomData, currentUser } = get();
                    if (roomData && payload.new.user_id) {
                        const newHostId = payload.new.user_id;
                        console.log(
                            `[LobbyStore] 🎭 Host changed: ${payload.old.user_id} → ${newHostId}`,
                        );
                        set({
                            roomData: { ...roomData, user_id: newHostId },
                            isHost: newHostId === get().currentUser?.id,
                        });
                    }

                    // Redirect semua player ke halaman game saat room_status berubah jadi 'playing'
                    if (
                        roomData &&
                        payload.new.room_status === "playing" &&
                        payload.old.room_status !== "playing"
                    ) {
                        console.log(
                            `[LobbyStore] ==================================================`,
                        );
                        console.log(
                            `[LobbyStore] 🎮 MATCH STARTED! Redirecting all players to game...`,
                        );
                        console.log(
                            `[LobbyStore] Current user ID: ${currentUser?.id}`,
                        );
                        console.log(
                            `[LobbyStore] Is current user host? ${
                                get().isHost
                            }`,
                        );
                        console.log(`[LobbyStore] Room data:`, roomData);
                        console.log(
                            `[LobbyStore] Room status changed:`,
                            payload.old.room_status,
                            "→",
                            payload.new.room_status,
                        );
                        console.log(
                            `[LobbyStore] Game URL: /game/${roomId}?code=${roomData.room_code}`,
                        );
                        console.log(
                            `[LobbyStore] ==================================================`,
                        );

                        if (typeof window !== "undefined" && currentUser?.id) {
                            const gameUrl = `/game/${roomId}?code=${roomData.room_code}`;
                            console.log(
                                `[LobbyStore] 🚀 Redirecting to: ${gameUrl}`,
                            );
                            window.location.href = gameUrl;
                        }
                    }
                },
            );

        lobbyChannel = channel;
        channel.subscribe((status) => {
            console.log("[Lobby] Channel subscription status:", status);

            if (status === "SUBSCRIBED") {
                isSubscribed = true;
                console.log("[Lobby] ✅ Channel subscribed successfully");

                // Track my presence setelah channel siap
                if (myPlayerPayload) {
                    channel
                        .track(myPlayerPayload)
                        .then(() => {
                            console.log(
                                "[Lobby] ✅ Presence tracked successfully",
                            );
                        })
                        .catch((err) => {
                            console.error(
                                "[Lobby] ❌ Error tracking presence:",
                                err,
                            );
                        });
                }
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                console.warn(
                    `[Lobby] ❌ Sub ${roomId} ${status}. Cleaning up and Retrying in 3s...`,
                );
                isSubscribed = false;

                if (lobbyChannel) {
                    try {
                        supabase.removeChannel(lobbyChannel);
                    } catch (err) {
                        console.error("[Lobby] Cleanup error:", err);
                    }
                    lobbyChannel = null;
                }

                // Retry subscription after delay
                setTimeout(async () => {
                    const currentStore = useQuizLobbyStore.getState();
                    // Cek status login jika timeout, kemungkinan token kadaluarsa
                    if (status === "TIMED_OUT") {
                        await supabase.auth.getSession();
                    }

                    if (
                        currentStore.roomData?.game_room_id === roomId &&
                        !isSubscribed
                    ) {
                        console.log(`[Lobby] 🔁 Retrying sub for ${roomId}...`);
                        currentStore.subscribeToPresence(roomId);
                    }
                }, 3000);
            } else if (status === "CLOSED") {
                console.warn("[Lobby] ⚠️ Channel closed");
                isSubscribed = false;
                lobbyChannel = null;
            } else {
                console.log(`[Lobby] Channel ${roomId} status:`, status);
            }
        });
    },

    unsubscribeFromPresence: () => {
        if (lobbyChannel) {
            const supabase = createClient();
            supabase.removeChannel(lobbyChannel);
            lobbyChannel = null;
        }
    },
}));
