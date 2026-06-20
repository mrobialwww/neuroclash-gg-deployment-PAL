"use client";

import { useEffect, useState } from "react";
import ShopClient from "@/components/shop/ShopClient";
import { useRouter } from "next/navigation";

export default function ShopPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string>("");

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();

                const {
                    data: { user },
                    error,
                } = await supabase.auth.getUser();

                // Kalau belum login, redirect ke halaman login
                if (error || !user?.id) {
                    router.push("/signin");
                } else {
                    setUserId(user.id);
                }
            } catch (error) {
                console.error("[Shop] Error checking auth:", error);
                router.push("/signin");
            }
        };

        checkAuth();
    }, [router]);

    return userId ? <ShopClient userId={userId} /> : null;
}
