import type { Metadata } from "next";
import { Baloo_2 } from "next/font/google";
import { Toaster } from "sonner";
import Image from "next/image";
import QueryProvider from "@/components/common/QueryProvider";
import "./globals.css";

const baloo2 = Baloo_2({
  variable: "--font-baloo-2",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NeuroClash GG",
  description: "NeuroClash GG - AI-powered quiz platform",
  icons: {
    icon: "/common/logo_browser.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${baloo2.variable} relative min-h-screen antialiased`}>
        {/* Scrolling Background Container - Looping & Mirrored */}
        <div className="pointer-events-none absolute inset-0 -z-50 flex h-full w-full select-none flex-col overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className={`relative h-screen w-full shrink-0 ${i % 2 !== 0 ? "scale-y-[-1]" : ""}`}>
              <Image src="/background.webp" alt={`Background Tile ${i}`} fill priority={i < 2} sizes="100vw" className="object-cover" />
            </div>
          ))}
        </div>

        {/* Konten Utama */}
        <QueryProvider>
          <div className="relative z-0">{children}</div>
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
