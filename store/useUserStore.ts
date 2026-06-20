import { create } from "zustand";

interface UserState {
    username: string;
    coins: number;
    avatar: string;
    baseCharacter: string;
    isInitialized: boolean;
    setUserData: (data: {
        username: string;
        coins: number;
        avatar: string;
        baseCharacter: string;
    }) => void;
    updateCoins: (coins: number) => void;
    updateAvatar: (avatar: string, baseCharacter?: string) => void;
    updateUsername: (username: string) => void;
}

/**
 * Store untuk mengelola data user global (username, coin, avatar)
 * Digunakan agar perubahan data (seperti koin setelah transaksi)
 * tersinkronisasi antar komponen (misal Navbar dan Shop)
 */
export const useUserStore = create<UserState>((set) => ({
    username: "Guest",
    coins: 0,
    avatar: "/default/Slime.webp",
    baseCharacter: "Slime",
    isInitialized: false,
    setUserData: (data) => set({ ...data, isInitialized: true }),
    updateCoins: (coins) => set({ coins }),
    updateAvatar: (avatar, baseCharacter) =>
        set((state) => ({
            avatar,
            baseCharacter: baseCharacter || state.baseCharacter,
        })),
    updateUsername: (username) => set({ username }),
}));
