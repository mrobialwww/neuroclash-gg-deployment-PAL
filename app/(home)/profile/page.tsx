"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileClient from "@/components/profile/ProfileClient";

export default function ProfilePage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();
                const {
                    data: { user },
                    error,
                } = await supabase.auth.getUser();

                if (error || !user?.id) {
                    router.push("/signin");
                } else {
                    setUserId(user.id);
                }
            } catch (error) {
                console.error("[Profile] Error checking auth:", error);
                router.push("/signin");
            }
        };

        checkAuth();
    }, [router]);

    if (!userId) return null;

    return <ProfileClient userId={userId} />;
}
