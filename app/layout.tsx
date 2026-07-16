import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GlowCursor } from "@/components/background/Glowtrail";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AXIOM — Personal Intelligence OS",
  description:
    "A dark, immersive personal intelligence command center: tasks, habits, finance, and goals with AI coaching.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-[#07080d] text-zinc-50 antialiased">
        <div aria-hidden className="bubble bubble-a" />
        <div aria-hidden className="bubble bubble-b" />
        <div className="relative z-[1]">{children}</div>
        <GlowCursor />
      </body>
    </html>
  );
}
