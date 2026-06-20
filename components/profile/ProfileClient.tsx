import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useUserStore } from "@/store/useUserStore";
import { toast } from "sonner";
import {
    Loader2,
    Check,
    X,
    User,
    Mail,
    Calendar,
    Hash,
    ChevronRight,
    LogOut,
} from "lucide-react";
import { getCharacterBgColor } from "@/lib/constants/characters";
import { MainButton } from "@/components/common/MainButton";
import axios from "axios";

interface ProfileData {
    user_id: string;
    username: string;
    email: string;
    created_at: string;
}

export default function ProfileClient({ userId }: { userId: string }) {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const { avatar, baseCharacter, updateUsername } = useUserStore();

    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/users/${userId}`);
            const result = await res.json();

            if (result.success) {
                const data = Array.isArray(result.data)
                    ? result.data[0]
                    : result.data;
                setProfile(data);
                setNewUsername(data.username);
            } else {
                toast.error("Gagal memuat profil");
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            toast.error("Terjadi kesalahan jaringan");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleUpdateUsername = async () => {
        if (newUsername.trim().length < 3) {
            toast.error("Username minimal 3 karakter");
            return;
        }

        if (newUsername === profile?.username) {
            setIsEditing(false);
            return;
        }

        setIsUpdating(true);
        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: newUsername }),
            });

            const result = await res.json();
            if (result.success) {
                setProfile((prev) =>
                    prev ? { ...prev, username: newUsername } : null,
                );
                updateUsername(newUsername);
                toast.success("Username berhasil diperbarui!");
                setIsEditing(false);
            } else {
                toast.error(result.error || "Gagal memperbarui username");
            }
        } catch (error) {
            toast.error("Terjadi kesalahan jaringan");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await axios.post("/api/auth/signout");
            window.location.href = "/signin";
        } catch (error) {
            toast.error("Gagal keluar");
            setIsLoggingOut(false);
        }
    };

    if (loading) {
        return (
            <main className="mx-auto max-w-2xl animate-pulse px-6 py-20">
                <div className="mb-12 flex flex-col items-center">
                    <div className="mb-6 h-32 w-32 rounded-full bg-white/10" />
                    <div className="mb-2 h-8 w-48 rounded bg-white/10" />
                    <div className="h-5 w-64 rounded bg-white/10" />
                </div>
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-xl bg-white/10" />
                    ))}
                </div>
            </main>
        );
    }

    if (!profile) return null;

    return (
        <main className="mx-auto max-w-2xl px-4 py-10 pb-20 sm:px-8 md:py-16">
            {/* Profile Header */}
            <div className="mb-6 flex flex-col items-center md:mb-8">
                <div
                    className="relative mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white transition-transform duration-500 md:mb-6 md:h-32 md:w-32"
                    style={{
                        backgroundColor: getCharacterBgColor(
                            baseCharacter || "Slime",
                        ),
                    }}
                >
                    <div className="relative h-[75%] w-[75%]">
                        <Image
                            src={avatar || "/default/Slime.webp"}
                            alt="Avatar"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>

                <div className="flex flex-col items-center text-center">
                    <h1 className="mb-1 text-2xl font-bold tracking-tight text-white md:mb-2 md:text-3xl">
                        {profile.username}
                    </h1>
                    <p className="text-sm font-medium text-[#A1A1AA] md:text-base">
                        {profile.email}
                    </p>
                </div>
            </div>

            {/* Account Info List */}
            <div className="space-y-3 md:space-y-4">
                <div className="mb-2 mt-4 px-1 text-lg font-bold text-white md:mb-4 md:text-xl">
                    Pengaturan Akun
                </div>

                {/* Username Row */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-1">
                    {isEditing ? (
                        <div className="flex items-center gap-2 p-2 md:p-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4F4F5] text-[#71717A] md:h-10 md:w-10">
                                <User size={18} className="md:h-5 md:w-5" />
                            </div>
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="Username baru"
                                className="w-full flex-1 bg-transparent px-1 text-base font-semibold text-black outline-none md:px-2 md:text-lg"
                                autoFocus
                                onKeyDown={(e) =>
                                    e.key === "Enter" && handleUpdateUsername()
                                }
                            />
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleUpdateUsername}
                                    disabled={isUpdating}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4D70E8] text-white transition-colors hover:bg-[#3D5FD0] disabled:opacity-50 md:h-10 md:w-10"
                                    title="Simpan"
                                >
                                    {isUpdating ? (
                                        <Loader2
                                            className="animate-spin"
                                            size={16}
                                        />
                                    ) : (
                                        <Check
                                            size={16}
                                            className="md:h-4 md:w-4"
                                        />
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setNewUsername(profile.username);
                                    }}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4F4F5] text-[#71717A] transition-colors hover:bg-[#E4E4E7] md:h-10 md:w-10"
                                    title="Batal"
                                >
                                    <X size={16} className="md:h-4 md:w-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="group/row flex w-full items-center justify-between p-4 transition-colors hover:bg-[#FAFAFA] md:p-5"
                        >
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4F4F5] text-[#71717A] md:h-11 md:w-11">
                                    <User
                                        size={20}
                                        className="md:h-[22px] md:w-[22px]"
                                    />
                                </div>
                                <div className="text-left">
                                    <div className="mb-0.5 text-[10px] font-semibold text-[#A1A1AA] md:text-xs">
                                        Username
                                    </div>
                                    <div className="text-base font-bold leading-tight text-black md:text-lg">
                                        {profile.username}
                                    </div>
                                </div>
                            </div>
                            <div className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[#555555] transition-colors group-hover/row:text-black md:gap-2">
                                <span className="text-md font-semibold md:text-lg">
                                    Ganti
                                </span>
                                <ChevronRight
                                    size={16}
                                    className="md:h-[18px] md:w-[18px]"
                                />
                            </div>
                        </button>
                    )}
                </div>

                {/* Email Row (Read Only) */}
                <div className="flex items-center justify-between rounded-2xl bg-white p-4 md:p-5">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4F4F5] text-[#71717A] md:h-11 md:w-11">
                            <Mail
                                size={20}
                                className="md:h-[22px] md:w-[22px]"
                            />
                        </div>
                        <div className="text-left">
                            <div className="mb-0.5 text-[10px] font-semibold text-[#A1A1AA] md:text-xs">
                                Email
                            </div>
                            <div className="break-all text-base font-bold leading-tight text-black md:break-normal md:text-lg">
                                {profile.email}
                            </div>
                        </div>
                    </div>
                </div>

                {/* User ID Row */}
                <div className="flex items-center justify-between rounded-2xl bg-white p-4 md:p-5">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4F4F5] text-[#71717A] md:h-11 md:w-11">
                            <Hash
                                size={20}
                                className="md:h-[22px] md:w-[22px]"
                            />
                        </div>
                        <div className="text-left">
                            <div className="mb-0.5 text-[10px] font-semibold text-[#A1A1AA] md:text-xs">
                                ID Pengguna
                            </div>
                            <div className="max-w-[140px] truncate text-sm font-bold leading-tight text-black sm:max-w-none md:text-lg">
                                {profile.user_id}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Join Date Row */}
                <div className="flex items-center justify-between rounded-2xl bg-white p-4 md:p-5">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4F4F5] text-[#71717A] md:h-11 md:w-11">
                            <Calendar
                                size={20}
                                className="md:h-[22px] md:w-[22px]"
                            />
                        </div>
                        <div className="text-left">
                            <div className="mb-0.5 text-[10px] font-semibold text-[#A1A1AA] md:text-xs">
                                Bergabung Sejak
                            </div>
                            <div className="text-base font-bold leading-tight text-black md:text-lg">
                                {new Date(
                                    profile.created_at,
                                ).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logout Section */}
                <div className="flex justify-center pt-4 md:pt-6">
                    <MainButton
                        variant="red"
                        size="sm"
                        onClick={handleLogout}
                        isLoading={isLoggingOut}
                        className="h-10 px-6 md:h-11 md:px-8"
                    >
                        <div className="flex items-center gap-2 text-sm md:text-base">
                            <LogOut size={16} className="md:h-4 md:w-4" />
                            <span>Keluar dari Akun</span>
                        </div>
                    </MainButton>
                </div>
            </div>
        </main>
    );
}
