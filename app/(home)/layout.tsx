import React, { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";

export default function HomeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="font-(family-name:--font-baloo-2) min-h-screen">
            <Navbar initialData={null} />

            <main>
                <Suspense
                    fallback={
                        <div className="p-10 text-center">
                            Memuat Dashboard...
                        </div>
                    }
                >
                    {children}
                </Suspense>
            </main>
        </div>
    );
}
