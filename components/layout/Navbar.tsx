"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { SearchBar } from "../common/Searchbar";
import { useUserStore } from "@/store/useUserStore";
import { Suspense } from "react";

interface NavbarProps {
    initialData?: {
        username: string;
        coins: number;
        avatar: string;
        baseCharacter: string;
    } | null;
}

export function Navbar({ initialData }: NavbarProps) {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const {
        coins: storeCoins,
        avatar: storeAvatar,
        username: storeUsername,
        isInitialized,
        setUserData,
    } = useUserStore();

    const [highlightStyle, setHighlightStyle] = useState({
        left: 0,
        width: 0,
        opacity: 0,
    });
    const navRefs = useRef<(HTMLAnchorElement | null)[]>([]);

    // Sinkronisasi data awal dari server ke global store
    useEffect(() => {
        if (initialData && !isInitialized) {
            setUserData({
                username: initialData.username,
                coins: initialData.coins,
                avatar: initialData.avatar,
                baseCharacter: initialData.baseCharacter,
            });
        }
    }, [initialData, isInitialized, setUserData]);

    // Fetch user data on client side if not initialized
    useEffect(() => {
        if (!isInitialized && !initialData) {
            const fetchUserData = async () => {
                try {
                    const { createClient } = await import(
                        "@/lib/supabase/client"
                    );
                    const supabase = createClient();
                    const {
                        data: { user },
                    } = await supabase.auth.getUser();

                    if (user) {
                        const res = await fetch(`/api/users/${user.id}`, {
                            cache: "no-store",
                            credentials: "include",
                        });
                        if (res.ok) {
                            const result = await res.json();
                            const userData = Array.isArray(result.data)
                                ? result.data[0]
                                : result.data;

                            if (userData) {
                                const charRes = await fetch(
                                    `/api/user-character/${user.id}?is_used=true`,
                                    {
                                        cache: "no-store",
                                        credentials: "include",
                                    },
                                );
                                let avatar = "/default/Slime.webp";
                                let baseCharacter = "Slime";
                                if (charRes.ok) {
                                    const charResult = await charRes.json();
                                    const charData = Array.isArray(
                                        charResult.data,
                                    )
                                        ? charResult.data[0]
                                        : charResult.data;
                                    avatar = charData?.image_url || avatar;
                                    baseCharacter =
                                        charData?.base_character ||
                                        baseCharacter;
                                }

                                setUserData({
                                    username: userData.username || "Guest",
                                    coins: userData.coin || 0,
                                    avatar,
                                    baseCharacter,
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error("[Navbar] Error fetching user data:", error);
                }
            };

            fetchUserData();
        }
    }, [isInitialized, initialData, setUserData]);

    const user = {
        username: storeUsername,
        coins: storeCoins,
        avatar: storeAvatar,
    };

    const navLinks = [
        { name: "Beranda", href: "/dashboard", icon: "/icons/home.svg" },
        { name: "Riwayat", href: "/history", icon: "/icons/history.svg" },
        { name: "Toko", href: "/shop", icon: "/icons/shop.svg" },
        {
            name: "Papan Peringkat",
            href: "/leaderboard",
            icon: "/icons/chart.svg",
        },
    ];

    useEffect(() => {
        const idx = navLinks.findIndex((link) => link.href === pathname);
        if (idx !== -1 && navRefs.current[idx]) {
            const el = navRefs.current[idx]!;
            setHighlightStyle({
                left: el.offsetLeft,
                width: el.offsetWidth,
                opacity: 1,
            });
        } else {
            setHighlightStyle((prev) => ({ ...prev, opacity: 0 }));
        }
    }, [pathname]);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white">
            <div className="mx-auto flex h-[72px] max-w-[1440px] items-stretch justify-between px-4 md:px-8 lg:gap-4 lg:px-12">
                {/* Left: Logo & Search */}
                <div className="flex flex-1 items-center gap-8 lg:flex-none">
                    <Link
                        href="/"
                        className="flex shrink-0 items-center transition-opacity hover:opacity-80"
                    >
                        <Image
                            src="/icons/neuroclash.svg"
                            alt="Neuroclash Logo"
                            width={50}
                            height={50}
                            priority
                            className="h-auto w-[50px]"
                            style={{ height: "auto" }}
                        />
                    </Link>
                    <div className="hidden w-[300px] xl:block xl:w-[360px]">
                        <Suspense>
                            <SearchBar />
                        </Suspense>
                    </div>
                </div>

                {/* Center: Desktop Navigation */}
                <nav className="relative hidden items-center md:flex lg:gap-2">
                    {navLinks.map((link, i) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                ref={(el) => {
                                    navRefs.current[i] = el;
                                }}
                                className={cn(
                                    "group relative flex h-full items-center gap-2 px-4 transition-all duration-300 ease-in-out",
                                    isActive
                                        ? "text-[#256AF4]"
                                        : "text-[#A1A1A1] hover:text-[#555555]",
                                )}
                            >
                                <div className="h-6 w-6">
                                    <div
                                        className="h-full w-full bg-current"
                                        style={{
                                            maskImage: `url(${link.icon})`,
                                            WebkitMaskImage: `url(${link.icon})`,
                                            maskRepeat: "no-repeat",
                                            WebkitMaskRepeat: "no-repeat",
                                            maskSize: "contain",
                                            WebkitMaskSize: "contain",
                                            transition:
                                                "background-color 0.3s ease-in-out",
                                        }}
                                    />
                                </div>
                                <span className="text-md whitespace-nowrap font-semibold transition-colors duration-300">
                                    {link.name}
                                </span>
                            </Link>
                        );
                    })}
                    {/* Active indicator */}
                    <div
                        className="absolute bottom-0 h-1 bg-[#256AF4] transition-all duration-300 ease-in-out"
                        style={{
                            left: highlightStyle.left,
                            width: highlightStyle.width,
                            opacity: highlightStyle.opacity,
                        }}
                    />
                </nav>

                {/* Right: User Stats */}
                <div className="flex flex-1 items-center justify-end gap-4 md:gap-6 lg:flex-none">
                    <Link
                        href="/profile"
                        className="avatar-link relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-full transition-all duration-500 ease-in-out hover:shadow-lg hover:ring-4 hover:ring-blue-100 active:scale-90 md:h-12 md:w-12"
                    >
                        <Image
                            src={user.avatar}
                            alt={`${user.username}'s Avatar`}
                            fill
                            sizes="(max-width: 768px) 40px, 48px"
                            className="object-contain transition-transform duration-500 hover:scale-110"
                        />
                    </Link>

                    <div className="flex items-center gap-2 rounded-full border border-[#DFB200] bg-[#F9DA61]/50 py-1 pl-1 pr-4 shadow-sm">
                        <div className="relative h-7 w-7 md:h-8 md:w-8">
                            <Image
                                src="/icons/coin-color.svg"
                                alt="Coin"
                                fill
                                sizes="32px"
                                className="object-contain"
                            />
                        </div>
                        <span className="text-sm font-bold tracking-tight text-[#AD8A00] md:text-base">
                            {user.coins.toLocaleString("id-ID")}
                        </span>
                    </div>

                    <button
                        className="p-2 text-[#555555] md:hidden"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="absolute left-0 top-full w-full space-y-2 border-b bg-white p-4 shadow-lg transition-all md:hidden">
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={cn(
                                    "flex items-center gap-4 rounded-xl p-3 transition-all",
                                    isActive
                                        ? "bg-blue-50 text-[#256AF4]"
                                        : "text-[#A1A1A1]",
                                )}
                            >
                                <div className="h-6 w-6">
                                    <div
                                        className="h-full w-full bg-current"
                                        style={{
                                            maskImage: `url(${link.icon})`,
                                            WebkitMaskImage: `url(${link.icon})`,
                                            maskRepeat: "no-repeat",
                                            WebkitMaskRepeat: "no-repeat",
                                            maskSize: "contain",
                                            WebkitMaskSize: "contain",
                                        }}
                                    />
                                </div>
                                <span className="font-semibold">
                                    {link.name}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </header>
    );
}
