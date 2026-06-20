"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HistoryClient from "@/components/history/HistoryClient";

export default function HistoryPage() {
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
                console.error("[History] Error checking auth:", error);
                router.push("/signin");
            }
        };

        checkAuth();
    }, [router]);

    return userId ? <HistoryClient userId={userId} /> : null;
}
