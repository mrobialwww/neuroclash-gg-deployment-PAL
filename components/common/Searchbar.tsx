"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

export function SearchBar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(searchParams.get("search") || "");

    // Sync state with URL params (if URL changes externally)
    useEffect(() => {
        setQuery(searchParams.get("search") || "");
    }, [searchParams]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        if (query.trim()) {
            params.set("search", query.trim());
        } else {
            params.delete("search");
        }
        router.push(`/dashboard?${params.toString()}`);
    };

    return (
        <form onSubmit={handleSearch} className="w-full max-w-[360px]">
            <div className="group flex items-center justify-between rounded-full border border-[#A1A1A1] bg-white px-5 py-2 transition-all focus-within:border-[#256AF4]">
                <input
                    type="text"
                    placeholder="Temukan Arena"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="text-md flex-1 bg-transparent font-medium outline-none placeholder:text-[#BABABA]"
                />

                <button
                    type="submit"
                    className="ml-2 flex shrink-0 cursor-pointer"
                >
                    <Image
                        src="/icons/search.svg"
                        alt="Search"
                        width={24}
                        height={24}
                    />
                </button>
            </div>
        </form>
    );
}
