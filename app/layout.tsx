import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProvider } from "@/components/AppProvider";
import { CardSidebar } from "@/components/CardSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  title: "BingoGen — Yearly Goal Bingo",
  description:
    "Turn your yearly goals into a bingo card and track your progress",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // "dark" is the default appearance before the useTheme hook rehydrates
    // the persisted preference on mount (localStorage isn't reachable
    // during SSR); this keeps first paint identical to the pre-toggle app.
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <AppProvider>
          <ThemeToggle />
          <div className="sm:flex">
            <CardSidebar />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
