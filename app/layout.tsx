import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import { MotionConfig } from "framer-motion";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" className={`${outfit.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-[#26292f] text-[#d3d7e0] antialiased">
        <MotionConfig reducedMotion="user">
          <div className="relative z-[1]">{children}</div>
        </MotionConfig>
      </body>
    </html>
  );
}
