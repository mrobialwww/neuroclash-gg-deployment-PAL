"use client";

import React from "react";
import Image from "next/image";

type Props = {
    title?: React.ReactNode;
    children?: React.ReactNode;
    background?: string;
};

export default function AuthCard({
    title,
    children,
    background = "/background/Daftar.png",
}: Props) {
    return (
        <div
            className="font-baloo-2 flex min-h-screen items-center justify-center bg-[#0a0a1a] bg-cover bg-center bg-no-repeat p-6"
            style={{ backgroundImage: `url('${background}')` }}
        >
            <div className="flex w-full max-w-[440px] flex-col items-center rounded-[24px] border border-white/10 bg-white/5 px-10 pb-9 pt-11 shadow-2xl backdrop-blur-[32px]">
                {/* Logo Section */}
                <div className="mb-5 flex items-center justify-center">
                    <div className="relative h-16 w-16">
                        <Image
                            src="/icons/neuroclash-white.svg"
                            alt="Neuroclash Logo"
                            fill
                            sizes="64px"
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>

                {/* Title */}
                {title && (
                    <h1 className="mb-7 text-center text-[22px] font-bold tracking-tight text-white">
                        {title}
                    </h1>
                )}

                {/* Form Container */}
                <div className="w-full">{children}</div>
            </div>
        </div>
    );
}
