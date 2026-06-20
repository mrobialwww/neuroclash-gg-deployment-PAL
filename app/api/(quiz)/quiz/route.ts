// POST /api/quiz
// melakukan mapping soal dan jawaban hasil generated geminiAPI ke table questions dan answers

import { NextResponse } from "next/server";
import { quizService } from "@/modules/quiz/quiz.service";

export async function POST(req: Request) {
    try {
        const result = await quizService.generateQuizFromRequest(req);
        return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
        console.error("[API Quiz] Error:", error);

        const msg = error instanceof Error ? error.message : String(error);

        // ── Friendly error messages for known AI failure modes ────────────────
        if (msg === "AI_NO_JSON") {
            return NextResponse.json(
                { message: "Oops! AI gagal membuat soal dengan format yang benar. Silakan coba lagi." },
                { status: 500 },
            );
        }
        if (msg === "AI_PARSE_ERROR") {
            return NextResponse.json(
                { message: "Oops! Text dari AI sedikit berantakan. Silakan Create Room sekali lagi ya." },
                { status: 500 },
            );
        }
        if (
            msg.includes("Content-Type tidak didukung") ||
            msg.includes("Harap sertakan") ||
            msg.includes("URL tidak ditemukan")
        ) {
            return NextResponse.json({ message: msg }, { status: 400 });
        }

        // ── Parse Gemini / Google API error codes ─────────────────────────────
        let geminiStatus: number | null = null;
        let geminiCode: string | null = null;
        try {
            const jsonStart = msg.indexOf("{");
            if (jsonStart !== -1) {
                const parsed = JSON.parse(msg.slice(jsonStart));
                geminiStatus = parsed?.error?.code ?? null;
                geminiCode = parsed?.error?.status ?? null;
            }
        } catch { /* not a JSON error */ }

        if (geminiStatus === 503 || geminiCode === "UNAVAILABLE") {
            return NextResponse.json(
                {
                    message:
                        "Server AI sedang kelebihan beban (503 Unavailable). " +
                        "Model Gemini saat ini sedang ramai digunakan. " +
                        "Tunggu beberapa saat lalu coba lagi.",
                },
                { status: 503 },
            );
        }
        if (geminiStatus === 429 || geminiCode === "RESOURCE_EXHAUSTED") {
            return NextResponse.json(
                {
                    message:
                        "Kuota API Gemini habis (429 Too Many Requests). " +
                        "Coba lagi dalam beberapa menit.",
                },
                { status: 429 },
            );
        }
        if (geminiStatus === 400 || geminiCode === "INVALID_ARGUMENT") {
            return NextResponse.json(
                {
                    message:
                        "Dokumen tidak dapat dibaca oleh AI (400 Invalid Argument). " +
                        "Pastikan file PDF tidak rusak dan tidak terproteksi password.",
                },
                { status: 400 },
            );
        }

        // ── Fallback ──────────────────────────────────────────────────────────
        console.error("[API Quiz] Fallback Error details:", error);
        return NextResponse.json(
            {
                message:
                    "Oops! Proses pembuatan soal gagal akibat kendala server AI. Silakan coba beberapa saat lagi ya.",
            },
            { status: 500 },
        );
    }
}
