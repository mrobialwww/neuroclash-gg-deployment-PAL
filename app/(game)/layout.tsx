import React, { Suspense } from "react";

export default async function GameLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="font-(family-name:--font-baloo-2) min-h-screen">
            <main>
                <Suspense
                    fallback={
                        <div className="p-10 text-center text-white">
                            Memuat Game...
                        </div>
                    }
                >
                    {children}
                </Suspense>
            </main>
        </div>
    );
}
