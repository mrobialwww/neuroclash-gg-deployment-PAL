"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function CreateQuizDummy() {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<any>(null); // State untuk menampung hasil JSON dari Gemini
    const [savedRoom, setSavedRoom] = useState<any>(null);

    // State terpisah untuk masing-masing skenario
    const [file, setFile] = useState<File | null>(null);
    const [category, setCategory] = useState<string>("");
    const [maxPlayer, setMaxPlayer] = useState<string>("0");
    const [round, setRound] = useState<string>("0");
    const [difficulty, setDifficulty] = useState<string>("");

    /**
     * Skenario 1: Upload File Fisik (multipart/form-data)
     */
    const handleFileUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return alert("Harap sertakan file PDF terlebih dahulu.");

        setLoading(true);
        setResult(null);
        setSavedRoom(null);

        try {
            const formData = new FormData();
            formData.append("pdf", file);
            formData.append("maxPlayer", maxPlayer);
            formData.append("round", round);
            formData.append("difficulty", difficulty);

            // fetch tidak perlu headers Content-Type karena browser akan
            // otomatis menentukan boundary untuk multipart/form-data
            const response = await fetch("/api/quiz", {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan saat mengunggah file.");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Skenario 2: Pilih Kategori dari Supabase Bucket (application/json)
     */
    const handleCategorySelect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!category) return alert("Harap pilih materi terlebih dahulu.");
        if (!difficulty)
            return alert("Harap pilih tingkat kesulitan terlebih dahulu.");

        setLoading(true);
        setResult(null);
        setSavedRoom(null);

        try {
            const response = await fetch("/api/quiz", {
                method: "POST",
                // WAJIB ditambahkan agar rute Anda masuk ke blok else if (contentType.includes("application/json"))
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    category,
                    maxPlayer,
                    round,
                    difficulty,
                }),
                credentials: "include",
            });

            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan saat memproses kategori.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRoom = async () => {
        if (!result) return;
        setSaving(true);
        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                alert("Kamu belum login! Silakan login untuk membuat ruangan.");
                setSaving(false);
                return;
            }

            const response = await fetch("/api/game-rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: user.id,
                    category: category || "",
                    max_player: maxPlayer,
                    total_question: maxPlayer,
                    total_round: round,
                    difficulty: difficulty,
                    questions: result.geminiFile ? result.geminiFile : result, // Send only the gemini content
                }),
                credentials: "include",
            });
            const data = await response.json();
            setSavedRoom(data);
            alert("Game Room berhasil dibuat dan disimpan ke database!");
        } catch (error) {
            console.error(error);
            alert("Gagal menyimpan Game Room.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container mx-auto max-w-2xl p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Generate Kuis dengan AI</CardTitle>
                    <CardDescription>
                        Pilih metode yang kamu inginkan untuk men-generate soal
                        kuis dari PDF.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Jumlah maks pemain */}
                    <div className="mb-6 space-y-2">
                        <Label>Jumlah Maksimal Pemain</Label>
                        <Select value={maxPlayer} onValueChange={setMaxPlayer}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih jumlah maksimal pemain..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="15">15 Pemain</SelectItem>
                                <SelectItem value="20">20 Pemain</SelectItem>
                                <SelectItem value="25">25 Pemain</SelectItem>
                                <SelectItem value="30">30 Pemain</SelectItem>
                                <SelectItem value="35">35 Pemain</SelectItem>
                                <SelectItem value="40">40 Pemain</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Jumlah maks round */}
                    <div className="mb-6 space-y-2">
                        <Label>Jumlah Ronde</Label>
                        <Select value={round} onValueChange={setRound}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih jumlah ronde..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="15">15 Ronde</SelectItem>
                                <SelectItem value="20">20 Ronde</SelectItem>
                                <SelectItem value="25">25 Ronde</SelectItem>
                                <SelectItem value="30">30 Ronde</SelectItem>
                                <SelectItem value="35">35 Ronde</SelectItem>
                                <SelectItem value="40">40 Ronde</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Pilih tingkat kesulitan */}
                    <div className="space-y-2">
                        <Label>Tingkat Kesulitan</Label>
                        <Select onValueChange={setDifficulty}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih tingkat kesulitan..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mudah">Mudah</SelectItem>
                                <SelectItem value="sedang">Sedang</SelectItem>
                                <SelectItem value="sulit">Sulit</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Tabs defaultValue="upload" className="w-full">
                        <TabsList className="mb-6 grid w-full grid-cols-2">
                            <TabsTrigger value="upload">
                                Upload PDF Desktop
                            </TabsTrigger>
                            <TabsTrigger value="category">
                                Pilih Materi Sistem
                            </TabsTrigger>
                        </TabsList>

                        {/* TAB SCENARIO 1: UPLOAD PDF */}
                        <TabsContent value="upload">
                            <form
                                onSubmit={handleFileUpload}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="pdf-file">
                                        File Dokumen Pembelajaran
                                    </Label>
                                    <Input
                                        id="pdf-file"
                                        type="file"
                                        accept="application/pdf"
                                        onChange={(e) =>
                                            setFile(e.target.files?.[0] || null)
                                        }
                                    />
                                    <p className="text-muted-foreground text-sm">
                                        Hanya menerima format .pdf
                                    </p>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={loading || !file}
                                    className="w-full"
                                >
                                    {loading && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Generate Soal dari File
                                </Button>
                            </form>
                        </TabsContent>

                        {/* TAB SCENARIO 2: CATEGORY DROPDOWN */}
                        <TabsContent value="category">
                            <form
                                onSubmit={handleCategorySelect}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label>Kategori Materi</Label>
                                    <Select onValueChange={setCategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih materi dari sistem..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* Pastikan value ini sesuai dengan struktur folder di bucket Supabase Anda */}
                                            <SelectItem value="sejarah">
                                                Sejarah Indonesia
                                            </SelectItem>
                                            <SelectItem value="biologi">
                                                Biologi Sel
                                            </SelectItem>
                                            <SelectItem value="pancasila">
                                                Dasar Pancasila
                                            </SelectItem>
                                            <SelectItem value="bahasaindonesia">
                                                Bahasa Indonesia
                                            </SelectItem>
                                            <SelectItem value="bahasainggris">
                                                Bahasa Inggris
                                            </SelectItem>
                                            <SelectItem value="pemrograman">
                                                Pemrograman
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-muted-foreground text-sm">
                                        Materi ini akan diambil otomatis di
                                        sistem:
                                        /materials/[kategori]/[materi].pdf
                                    </p>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={
                                        loading || !category || !difficulty
                                    }
                                    className="w-full"
                                >
                                    {loading && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Generate Soal dari Sistem
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {result && (
                <Card className="mt-8 border-green-500 bg-green-50/50">
                    <CardHeader>
                        <CardTitle className="text-green-700">
                            Hasil Generate AI!
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 flex justify-end">
                            <Button
                                onClick={handleCreateRoom}
                                disabled={saving}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {saving && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Simpan ke Database
                            </Button>
                        </div>

                        {savedRoom && (
                            <div className="mb-4 rounded border border-slate-700 bg-slate-900 p-4">
                                <p className="mb-2 font-semibold text-white">
                                    Saved Game Room Data:
                                </p>
                                <pre className="overflow-x-auto text-xs text-slate-200">
                                    {JSON.stringify(savedRoom, null, 2)}
                                </pre>
                            </div>
                        )}

                        <p className="mb-2 font-semibold text-white">
                            Gemini Result:
                        </p>
                        <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-50">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
