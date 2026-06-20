"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { Loader2, Eye, EyeOff } from "lucide-react";
import AuthCard from "@/components/auth/AuthCard";
import { toast } from "sonner";
import axios from "axios";
import { LoginSchema } from "@/schemas";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export default function SignInPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<z.infer<typeof LoginSchema>>({
        resolver: zodResolver(LoginSchema),
        defaultValues: { email: "", password: "" },
    });

    const onSubmit = async (values: z.infer<typeof LoginSchema>) => {
        setIsLoading(true);
        try {
            const { data } = await axios.post("/api/auth/signin", values);
            if (data.success && data.redirectTo) {
                window.location.href = data.redirectTo;
            } else {
                toast.error("Login Gagal", { description: data.message });
            }
        } catch (error: any) {
            toast.error("Error", {
                description:
                    error?.response?.data?.message || "Coba lagi nanti.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true);
        try {
            const { data } = await axios.post("/api/auth/google");
            if (data.success && data.url) {
                window.location.href = data.url;
            }
        } catch (error: any) {
            toast.error("Authentication Error", {
                description: "Gagal inisialisasi Google login.",
            });
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <AuthCard title="Masuk">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Email Field */}
                <div className="group relative">
                    <label className="absolute -top-2.5 left-3 z-10 px-1 text-xs font-medium text-white/90 transition-colors group-focus-within:text-blue-400">
                        Email
                    </label>
                    <input
                        {...form.register("email")}
                        type="email"
                        placeholder="email@contoh.com"
                        className="w-full rounded-xl border border-white/20 bg-transparent px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-white/30 focus:border-blue-500/60"
                    />
                    {form.formState.errors.email && (
                        <p className="ml-1 mt-1.5 text-xs text-red-400">
                            {form.formState.errors.email.message}
                        </p>
                    )}
                </div>

                {/* Password Field */}
                <div className="group relative">
                    <label className="absolute -top-2.5 left-3 z-10 px-1 text-xs font-medium text-white/90 transition-colors group-focus-within:text-blue-400">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            {...form.register("password")}
                            type={showPassword ? "text" : "password"}
                            placeholder="Password kamu"
                            className="w-full rounded-xl border border-white/20 bg-transparent px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-white/30 focus:border-blue-500/60"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white"
                        >
                            {showPassword ? (
                                <EyeOff size={18} />
                            ) : (
                                <Eye size={18} />
                            )}
                        </button>
                    </div>
                    {form.formState.errors.password && (
                        <p className="ml-1 mt-1.5 text-xs text-red-400">
                            {form.formState.errors.password.message}
                        </p>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading || isGoogleLoading}
                    className="flex w-full items-center justify-center rounded-xl bg-[#256AF4] py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_18px_rgba(59,110,245,0.4)] transition-all hover:bg-blue-600 disabled:opacity-70"
                >
                    {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {isLoading ? "Memproses..." : "Masuk"}
                </button>
            </form>

            {/* Google Login */}
            <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading || isGoogleLoading}
                className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl bg-white/95 py-3 text-sm font-semibold text-[#1a1a2e] transition-colors hover:bg-white disabled:opacity-70"
            >
                {isGoogleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <Image
                        src="/icons/google.svg"
                        width={18}
                        height={18}
                        alt="Google"
                    />
                )}
                Masuk dengan Google
            </button>

            {/* Footer Links */}
            <div className="mt-6 text-center">
                <p className="text-sm text-white/80">
                    Belum punya akun?{" "}
                    <Link
                        href="/signup"
                        className="font-semibold text-white hover:underline"
                    >
                        Daftar
                    </Link>
                </p>
                <p className="mt-5 text-[12px] leading-relaxed text-white/50">
                    Dengan masuk, kamu menyetujui{" "}
                    <Link
                        href="/terms"
                        className="underline hover:text-white/80"
                    >
                        Ketentuan layanan
                    </Link>{" "}
                    dan{" "}
                    <Link
                        href="/privacy"
                        className="underline hover:text-white/80"
                    >
                        Kebijakan Privasi
                    </Link>
                </p>
            </div>
        </AuthCard>
    );
}
