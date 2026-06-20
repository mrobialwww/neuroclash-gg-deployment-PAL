import { quizRepository } from "@/modules/quiz/quiz.repository";
import { Answer, QuizOption, QuizQuestion } from "@/modules/quiz/quiz.schema";
import { ParticipantRecord } from "@/modules/gamePlayers/gamePlayers.schema";
import { gamePlayersService } from "@/modules/gamePlayers/gamePlayers.service";
import { generateWithRetry } from "@/lib/ai/gemini";
import { fetchFileBuffer } from "@/lib/utils/httpUtils";
import { gameRoomService } from "@/modules/games/game.service";
export const quizService = {
    /**
     * Generate quiz questions from a PDF (via file upload or template category).
     * Handles multipart/form-data and application/json content types.
     */
    async generateQuizFromRequest(req: Request): Promise<{
        geminiFile: unknown;
        message: string;
    }> {
        const contentType = req.headers.get("content-type") || "";
        let buffer: Buffer;
        let round = 0;
        let maxPlayer = 0;
        let difficulty: string | undefined;

        // 1. Multipart form-data (file upload or URL)
        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get("pdf") as File | null;
            const url = formData.get("url") as string | null;
            const rd = formData.get("round") as string | null;
            const mp = formData.get("maxPlayer") as string | null;
            const df = formData.get("difficulty") as string | null;
            if (rd) round = parseInt(rd, 10);
            if (mp) maxPlayer = parseInt(mp, 10);
            if (df) difficulty = df;

            if (file && file.size > 0) {
                buffer = Buffer.from(await file.arrayBuffer());
            } else if (url) {
                buffer = await fetchFileBuffer(
                    url,
                    "Gagal mengunduh PDF dari URL.",
                );
            } else {
                throw new Error("Harap sertakan file 'pdf' atau teks 'url'.");
            }
        }
        // 2. JSON body (category + difficulty template)
        else if (contentType.includes("application/json")) {
            const body = await req.json();
            const {
                category,
                difficulty: diff,
                round: rd,
                maxPlayer: mp,
            } = body;
            if (rd) round = parseInt(rd, 10);
            if (mp) maxPlayer = parseInt(mp, 10);
            difficulty = diff;

            const url = await quizRepository.getPDFPublicUrl(category, diff);
            if (!url) throw new Error("URL tidak ditemukan dalam body JSON.");
            buffer = await fetchFileBuffer(
                url,
                "Gagal mengunduh PDF dari URL.",
            );
        }
        // 3. Unsupported content type
        else {
            throw new Error(
                "Format Content-Type tidak didukung. Gunakan form-data atau application/json.",
            );
        }

        const targetCount = round + Math.ceil(round / 10);
        const abilityMaterials = Math.max(
            2,
            Math.round(0.2 * (maxPlayer + maxPlayer / 5)),
        );

        const generationConfig = {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
        };

        const result = (await generateWithRetry({
            model: "gemini-3.1-flash-lite-preview",
            contents: [
                `Buatkan ${targetCount} ${
                    contentType.includes("multipart/form-data")
                        ? `dengan tingkat kesulitan ${difficulty}`
                        : ""
                } soal pilihan ganda dari dokumen PDF ini.
Buatkan juga materi bacaan singkat (masing-masing cukup 4-5 kalimat) sejumlah ${abilityMaterials} buah yang diambil dari intisari dokumen tersebut.
Kembalikan HANYA JSON murni tanpa markdown, tanpa backtick, tanpa penjelasan apapun.
Format JSON yang harus dikembalikan:
{
  "theme_materials": "tema materi dari dokumen. Jika cocok, gunakan salah satu dari enum ini persis: bahasaindonesia | bahasainggris | biologi | pancasila | pemrograman | sejarah. Tapi jika tidak ada yang cocok (misal matematika), tuliskan materinya (contoh: matematika).",
  "list_questions": [
    {
      "order": 1,
      "question": "pertanyaan di sini",
      "options": [
        { "key": "A", "text": "pilihan A", "is_correct": false },
        { "key": "B", "text": "pilihan B", "is_correct": true },
        { "key": "C", "text": "pilihan C", "is_correct": false },
        { "key": "D", "text": "pilihan D", "is_correct": false }
      ],
      "explanation": "penjelasan singkat mengapa jawaban tersebut benar"
    }
  ],
  "ability_materials" : [
    {
      "title": "judul materi bacaan",
      "text": "isi materi bacaan singkat 4-5 kalimat yang diambil dari intisari dokumen"
    }
  ]
}
Pastikan:
- "order" dimulai dari 1 hingga ${targetCount}
- "is_correct" bernilai true hanya untuk 1 pilihan yang benar, sisanya false
- "explanation" berisi penjelasan singkat 1-2 kalimat mengapa jawaban tersebut benar
- Semua soal relevan dengan isi dokumen
- "order" merepresentasikan urutan tingkat kesulitan soal dari paling mudah ke paling susah`,
                {
                    inlineData: {
                        mimeType: "application/pdf",
                        data: buffer.toString("base64"),
                    },
                },
            ],
            config: generationConfig,
        })) as { text?: string };

        // ─── Parse Gemini response ────────────────────────────────────────────
        const rawText = result.text ?? "";
        const cleaned = rawText.replace(/```json|```/g, "").trim();

        let jsonStr = "";
        const startIndex = cleaned.indexOf("{");
        if (startIndex !== -1) {
            let braceCount = 0;
            let insideString = false;
            let escapeNext = false;
            for (let i = startIndex; i < cleaned.length; i++) {
                const char = cleaned[i];
                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }
                if (char === "\\") {
                    escapeNext = true;
                    continue;
                }
                if (char === '"') insideString = !insideString;
                if (!insideString) {
                    if (char === "{") braceCount++;
                    else if (char === "}") braceCount--;
                }
                if (braceCount === 0 && i > startIndex) {
                    jsonStr = cleaned.substring(startIndex, i + 1);
                    break;
                }
            }
        }

        if (!jsonStr) {
            console.error(
                "[QuizService] No JSON object found in Gemini response:",
                cleaned.substring(0, 200),
            );
            throw new Error("AI_NO_JSON");
        }

        let cleanedParsed: unknown;
        try {
            cleanedParsed = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error(
                "[QuizService] JSON Parse Exception:",
                parseError,
                "\nRaw:",
                jsonStr.substring(0, 200),
            );
            throw new Error("AI_PARSE_ERROR");
        }

        return { message: "Berhasil diproses.", geminiFile: cleanedParsed };
    },

    /**
     * Get a specific question by room and order
     */
    async getQuestion(gameRoomId: string, order: number) {
        return quizRepository.getQuestion(gameRoomId, order);
    },

    /**
     * Get answers for a specific question
     */
    async getAnswers(questionId: string) {
        return quizRepository.getAnswers(questionId);
    },

    /**
     * Fetch question + answers in parallel for a given round (order).
     * Returns null if the question doesn't exist (end of quiz).
     */
    async getQuestionWithAnswers(
        gameRoomId: string,
        order: number,
    ): Promise<QuizQuestion | null> {
        const question = await quizRepository.getQuestion(gameRoomId, order);
        if (!question) return null;

        const rawAnswers = await quizRepository.getAnswers(
            question.question_id,
        );

        // Sort answers by key (A → B → C → D) for consistent display
        const sorted = [...rawAnswers].sort((a, b) =>
            a.key.localeCompare(b.key),
        );

        const options: QuizOption[] = sorted.map((ans: Answer) => ({
            id: ans.answer_id,
            label: ans.key.toUpperCase(),
            text: ans.answer_text,
            isCorrect: ans.is_correct,
        }));

        return {
            question_id: question.question_id,
            question_text: question.question_text,
            question_order: question.question_order,
            options,
        };
    },

    /**
     * Submit user's selected answer.
     */
    async submitAnswer(userId: string, answerId: string, roundNumber: number) {
        // return quizRepository.submitAnswer(userId, answerId, roundNumber);
        return gamePlayersService.processAnswerSubmission(
            userId,
            answerId,
            roundNumber,
        );
    },

    /**
     * getLobbyData(roomId)
     * Orkestrasi data: Panggil fetchDetailedRoom dan fetchParticipants.
     * Gabungkan data menjadi objek LobbyData yang bersih.
     */
    async getLobbyData(roomId: string) {
        const [roomData, participants] = await Promise.all([
            gameRoomService.getRoomById(roomId),
            gamePlayersService.getRawParticipants(roomId),
        ]);

        if (!roomData) return null;

        const uniqueUsers = new Map<string, ParticipantRecord>();
        for (const p of participants) {
            if (p && p.user_id) {
                uniqueUsers.set(p.user_id, p);
            }
        }

        return {
            roomData,
            participants: Array.from(uniqueUsers.values()),
        };
    },

    /**
     * joinRoomByCode(roomId, userId, roomCode)
     * Validasi kode lalu panggil postJoinRoom.
     */
    async joinRoomByCode(roomId: string, userId: string, roomCode?: string) {
        // If roomCode is provided, we can validate it against the roomData first
        if (roomCode) {
            const room = await gameRoomService.getRoomById(roomId);
            if (!room || room.room_code !== roomCode) {
                throw new Error("Kode room tidak valid");
            }
        }

        return gamePlayersService.joinGameRoom(roomId, userId);
    },

    /**
     * handleSoloModeInit(roomId, userId)
     * Jika data room menunjukkan mode solo, pastikan user ID terdaftar sebagai partisipan tunggal.
     */
    async handleSoloModeInit(roomId: string, userId: string) {
        const roomData = await gameRoomService.getRoomById(roomId);
        if (roomData && roomData.max_player === 1) {
            // Join directly
            return this.joinRoomByCode(roomId, userId);
        }
        return null;
    },

    /**
     * duplicateRoom(roomId, maxPlayer, isSolo)
     * Create a new instance of a room.
     * Validates input and delegates directly to gameRoomService — no HTTP round-trip.
     * @param isSolo - true untuk mode solo (max_player = 1), false untuk multi (max_player = 15/20/40)
     */
    async duplicateRoom(
        roomId: string,
        maxPlayer: number,
        isSolo: boolean = false,
    ) {
        console.log("\n" + "=".repeat(80));
        console.log("[DUPLICATE] START DEBUG");
        console.log("=".repeat(80));
        console.log(
            `[QuizService] duplicateRoom START - roomId: ${roomId}, maxPlayer: ${maxPlayer}, isSolo: ${isSolo}`,
        );
        console.log(`[DUPLICATE] game_room_id: ${roomId}`);
        console.log(`[DUPLICATE] max_player: ${maxPlayer}`);
        console.log(`[DUPLICATE] is_solo: ${isSolo}`);

        try {
            // Business logic validation (moved here from the HTTP route layer)
            if (isSolo) {
                if (maxPlayer !== 1) {
                    console.error(
                        "[DUPLICATE] ❌ Invalid max_player for solo mode:",
                        maxPlayer,
                    );
                    throw new Error(
                        "Invalid max_player for solo mode. Must be 1",
                    );
                }
            } else {
                if (![15, 20, 40].includes(maxPlayer)) {
                    console.error(
                        "[DUPLICATE] ❌ Invalid max_player for multi mode:",
                        maxPlayer,
                    );
                    throw new Error(
                        "Invalid max_player for multi mode. Must be 15, 20, or 40",
                    );
                }
            }

            console.log(
                `[DUPLICATE] ✅ Validation passed - Mode: ${
                    isSolo ? "SOLO" : "MULTI"
                }`,
            );

            // Call gameRoomService directly — no HTTP overhead or layering violation
            const result = await gameRoomService.duplicateGameRoom(roomId, {
                max_player: maxPlayer,
                is_solo: isSolo,
            });

            console.log(
                "\n[DUPLICATE] ==================================================",
            );
            console.log("[DUPLICATE] ✅ SUCCESS - ROOM DUPLICATED");
            console.log(
                "[DUPLICATE] ==================================================",
            );
            console.log(`[QuizService] ✅ duplicateRoom SUCCESS:`, {
                game_room_id: result.newRoom.game_room_id,
                new_room_code: result.newRoomCode,
            });

            return {
                game_room_id: result.newRoom.game_room_id,
                new_room_code: result.newRoomCode,
            };
        } catch (error) {
            console.error("\n[DUPLICATE] ❌ FINAL ERROR:");
            console.error("[DUPLICATE] Error:", error);
            console.error(
                "[DUPLICATE] Error message:",
                error instanceof Error ? error.message : String(error),
            );
            console.error(
                "[DUPLICATE] Error stack:",
                error instanceof Error ? error.stack : "No stack",
            );
            throw error;
        }
    },
};
