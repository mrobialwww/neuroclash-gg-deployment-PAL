import React, { useState, useRef, useCallback } from "react";
import NextImage from "next/image";
import { cn } from "@/lib/utils/utils";
import { CategoryType, Difficulty } from "@/types/enums";

// ── Types ──────────────────────────────────────────────────────────────────
type CreateArenaModalProps = {
    open: boolean;
    onClose: () => void;
    isLoading?: boolean;
    loadingText?: string;
    errorMsg?: string | null;
    onSubmit?: (data: {
        materiId: string | null;
        file: File | null;
        maxPlayers: number;
        jumlahSoal: number;
        difficulty: Difficulty;
        room_visibility: "public" | "private";
        title: string;
    }) => void;
};

// ── Constants ─────────────────────────────────────────────────────────────
const CATEGORIES: { id: CategoryType; title: string }[] = [
    { id: "bahasaindonesia", title: "Bahasa Indonesia" },
    { id: "bahasainggris", title: "Bahasa Inggris" },
    { id: "biologi", title: "Biologi" },
    { id: "pancasila", title: "Pancasila" },
    { id: "pemrograman", title: "Pemrograman" },
    { id: "sejarah", title: "Sejarah" },
];

const PLAYER_OPTIONS = [15, 20, 25, 30, 35, 40];
const SOAL_OPTIONS = [15, 20, 25, 30, 35, 40];
const DIFFICULTIES: { label: string; value: Difficulty }[] = [
    { label: "Mudah", value: "mudah" },
    { label: "Sedang", value: "sedang" },
    { label: "Sulit", value: "sulit" },
];

const VISIBILITY_OPTIONS: { label: string; value: "public" | "private" }[] = [
    { label: "Publik", value: "public" },
    { label: "Privat", value: "private" },
];

// ── Icons ──────────────────────────────────────────────────────────────────
function UploadCloudIcon() {
    return (
        <NextImage
            src="/icons/upload.svg"
            alt="Upload Icon"
            width={48}
            height={48}
            className="h-10 w-10 opacity-80 md:h-12 md:w-12"
        />
    );
}

function XIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-6 w-6"
            stroke="currentColor"
            strokeWidth={2}
        >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function SearchIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5 text-gray-500"
            stroke="currentColor"
            strokeWidth={2}
        >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

// ── Materi Icon Component ─────────────────────────────────────────────────
function MateriIcon({ id, title }: { id: CategoryType; title: string }) {
    const [imgError, setImgError] = useState(false);
    const imageUrl = `https://cmgkgwzhiloxdttftmwf.supabase.co/storage/v1/object/public/room-categories/${id}2.webp`;
    const fallbackUrl = "/quiz-category/default.webp";

    return (
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full md:h-11 md:w-11">
            <NextImage
                src={imgError ? fallbackUrl : imageUrl}
                alt={title}
                fill
                sizes="44px"
                className="object-contain"
                onError={() => setImgError(true)}
            />
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function CreateArenaModal({
    open,
    onClose,
    onSubmit,
    isLoading = false,
    loadingText,
    errorMsg = null,
}: CreateArenaModalProps) {
    const [selectedMateri, setSelectedMateri] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [maxPlayers, setMaxPlayers] = useState<number | null>(null);
    const [jumlahSoal, setJumlahSoal] = useState<number | null>(null);
    const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
    const [roomVisibility, setRoomVisibility] = useState<
        "public" | "private" | null
    >(null);
    const [title, setTitle] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);

    const filtered = CATEGORIES.filter((m) =>
        m.title.toLowerCase().includes(search.toLowerCase()),
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);
    const handleDragLeave = useCallback(() => setIsDragging(false), []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type === "application/pdf") {
            setUploadedFile(file);
            setSelectedMateri(null);
        }
    }, []);

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                setUploadedFile(file);
                setSelectedMateri(null);
            }
        },
        [],
    );

    const handleMateriClick = (id: string) => {
        setSelectedMateri((prev) => (prev === id ? null : id));
        setUploadedFile(null);
    };

    let warningMessage = "";
    if (!title.trim()) warningMessage = "Isi Judul Kuis";
    else if (!selectedMateri && !uploadedFile)
        warningMessage = "Pilih Materi atau Upload Dokumen";
    else if (!maxPlayers) warningMessage = "Pilih Jumlah Maksimal Pemain";
    else if (!jumlahSoal) warningMessage = "Pilih Jumlah Soal";
    else if (!difficulty) warningMessage = "Pilih Tingkat Kesulitan";
    else if (!roomVisibility) warningMessage = "Pilih Visibilitas Room";

    const isFormComplete = warningMessage === "";

    const handleSubmit = () => {
        if (!isFormComplete) return;

        onSubmit?.({
            materiId: selectedMateri,
            file: uploadedFile,
            maxPlayers: maxPlayers!,
            jumlahSoal: jumlahSoal!,
            difficulty: difficulty!,
            room_visibility: roomVisibility!,
            title,
        });
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md sm:p-6 md:p-8"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            {/* ── Card ── */}
            <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#383347] bg-[#040619] shadow-2xl">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute right-5 top-5 z-10 cursor-pointer text-white/60 transition-colors hover:text-white"
                >
                    <XIcon />
                </button>

                {/* ── Scrollable Body ── */}
                <div className="scrollbar-minimal flex-1 overflow-y-auto px-6 pb-4 pt-8 md:px-8">
                    {/* Title Section */}
                    <div className="mb-6 pr-6 text-center md:mb-8">
                        <h2 className="text-2xl font-bold text-white">
                            Buat Arena Baru
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-white/80">
                            Buat room kuis seru dengan materi yang menantang
                        </p>
                    </div>

                    {/* Judul Kuis Input */}
                    <div className="mb-5 md:mb-6">
                        <p className="mb-3 text-sm font-semibold text-white">
                            Judul Kuis
                        </p>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Masukkan judul quiz..."
                            className="w-full rounded-lg border border-[#383347] bg-[#0d0f2b] px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition-colors focus:border-blue-500"
                        />
                    </div>

                    {/* Materi Section Label */}
                    <p className="mb-3 text-sm font-semibold text-white">
                        Pilih atau Upload Materi
                    </p>

                    {/* Search Input */}
                    <div className="group mb-3 flex items-center gap-3 rounded-lg border border-[#383347] bg-[#0d0f2b] px-4 py-3 transition-colors focus-within:border-blue-500">
                        <SearchIcon />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari materi sesuai keinginanmu..."
                            className="flex-1 bg-transparent text-sm font-medium text-white placeholder-white/60 outline-none"
                        />
                    </div>

                    {/* Materials Grid Box */}
                    <div className="mb-4 overflow-hidden rounded-lg border border-[#383347]">
                        <div className="scrollbar-minimal grid max-h-[200px] grid-cols-2 gap-2 overflow-y-auto bg-[#0d0f2b] p-3">
                            {filtered.length === 0 ? (
                                <div className="col-span-full py-10 text-center text-sm font-medium text-white/60">
                                    Oops! Tidak ada materi ditemukan
                                </div>
                            ) : (
                                filtered.map((m) => {
                                    const isActive = selectedMateri === m.id;
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() =>
                                                handleMateriClick(m.id)
                                            }
                                            className={cn(
                                                "group flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-left transition-all",
                                                isActive
                                                    ? "scale-[0.98] border-blue-600 bg-blue-600 shadow-lg"
                                                    : "border-[#383347] bg-[#0d1033] hover:border-gray-500",
                                            )}
                                        >
                                            <MateriIcon
                                                id={m.id as CategoryType}
                                                title={m.title}
                                            />
                                            <span className="line-clamp-2 text-xs font-semibold leading-snug text-white md:text-[13px]">
                                                {m.title}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Upload Dropzone Area */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-4 transition-all md:p-6",
                            isDragging
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-[#383347] hover:border-gray-500",
                            uploadedFile && "bg-green-500/5",
                        )}
                    >
                        <UploadCloudIcon />
                        <div className="text-center">
                            <p className="text-xs font-medium text-white/80 md:text-sm">
                                {uploadedFile ? (
                                    <span className="mb-1 block font-bold text-green-400">
                                        {uploadedFile.name}
                                    </span>
                                ) : (
                                    "Drag & drop PDF materi kamu di sini"
                                )}
                            </p>
                            {!uploadedFile && (
                                <p className="mt-1 text-[11px] tracking-wide  text-white/60">
                                    Atau klik untuk memilih file dari perangkat
                                </p>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Max Players Configuration */}
                    <div className="mt-6 md:mt-8">
                        <p className="mb-3 text-sm font-semibold text-white">
                            Jumlah Pemain Maksimal
                        </p>
                        <div className="grid grid-cols-6 gap-2.5">
                            {PLAYER_OPTIONS.map((n) => {
                                const isActive = maxPlayers === n;
                                return (
                                    <button
                                        key={n}
                                        onClick={() => setMaxPlayers(n)}
                                        className={cn(
                                            "aspect-[2.2/1] cursor-pointer rounded-md border text-sm font-bold transition-all",
                                            isActive
                                                ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                                : "border-[#383347] bg-transparent text-white/60 hover:border-gray-500 hover:text-white",
                                        )}
                                    >
                                        {n}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Questions Count Configuration */}
                    <div className="mt-5 md:mt-6">
                        <p className="mb-3 text-sm font-semibold text-white">
                            Jumlah Soal
                        </p>
                        <div className="grid grid-cols-6 gap-2.5">
                            {SOAL_OPTIONS.map((n) => {
                                const isActive = jumlahSoal === n;
                                return (
                                    <button
                                        key={n}
                                        onClick={() => setJumlahSoal(n)}
                                        className={cn(
                                            "aspect-[2.2/1] cursor-pointer rounded-md border text-sm font-bold transition-all",
                                            isActive
                                                ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                                : "border-[#383347] bg-transparent text-white/60 hover:border-gray-500 hover:text-white",
                                        )}
                                    >
                                        {n}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Difficulty Selection */}
                    <div className="mt-5 md:mt-6">
                        <p className="mb-3 text-sm font-semibold text-white">
                            Tingkat Kesulitan
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                            {DIFFICULTIES.map((d) => {
                                const isActive = difficulty === d.value;
                                return (
                                    <button
                                        key={d.value}
                                        onClick={() => setDifficulty(d.value)}
                                        className={cn(
                                            "cursor-pointer rounded-lg border py-1 text-sm font-bold transition-all md:py-1.5",
                                            isActive
                                                ? "border-blue-600 bg-blue-600 text-white shadow-lg"
                                                : "border-[#383347] bg-transparent text-white/60 hover:border-gray-500 hover:text-white",
                                        )}
                                    >
                                        {d.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Room Visibility Selection */}
                    <div className="mt-5 md:mt-6">
                        <p className="mb-3 text-sm font-semibold text-white">
                            Visibilitas Room
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {VISIBILITY_OPTIONS.map((v) => {
                                const isActive = roomVisibility === v.value;
                                return (
                                    <button
                                        key={v.value}
                                        onClick={() =>
                                            setRoomVisibility(v.value)
                                        }
                                        className={cn(
                                            "cursor-pointer rounded-lg border py-1 text-sm font-bold transition-all md:py-1.5",
                                            isActive
                                                ? "border-blue-600 bg-blue-600 text-white shadow-lg"
                                                : "border-[#383347] bg-transparent text-white/60 hover:border-gray-500 hover:text-white",
                                        )}
                                    >
                                        {v.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── Action Bar (Submit) ── */}
                <div className="border-t border-[#383347] bg-[#040619] px-6 py-5 md:px-8">
                    {/* Error Banner */}
                    {errorMsg && (
                        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400">
                            {errorMsg}
                        </div>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !isFormComplete}
                        className={cn(
                            "md:text-md group flex w-full items-center justify-center gap-2 rounded-lg py-2 text-base font-bold text-white shadow-xl transition-all md:py-3",
                            isLoading || !isFormComplete
                                ? "cursor-not-allowed bg-gray-600 opacity-60"
                                : "cursor-pointer bg-blue-600 shadow-blue-900/10 hover:bg-blue-500 active:scale-[0.98]",
                        )}
                    >
                        {isLoading ? (
                            <>
                                <svg
                                    className="h-5 w-5 animate-spin text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                    />
                                </svg>
                                {loadingText || "Memproses..."}
                            </>
                        ) : !isFormComplete ? (
                            <>{warningMessage}</>
                        ) : (
                            <>
                                <span className="transition-transform group-hover:-rotate-12 group-hover:scale-110">
                                    🚀
                                </span>
                                Buat Arena Baru
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
