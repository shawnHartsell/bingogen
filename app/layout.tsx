import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProvider } from "@/components/AppProvider";
import { CardSidebar } from "@/components/CardSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { THEME_STORAGE_KEY } from "@/hooks/useTheme";
import "./globals.css";

// Runs synchronously before paint (inline, non-deferred script) so the
// `dark` class is present on <html> before React hydrates. Without this,
// a stored 'light' preference would flash dark-then-light on reload, and
// even the default (no stored preference => dark) would briefly race
// against hydration. Kept as plain JS text (not an import) since it must
// execute outside of React/module bundling.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t!=='light'){document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`;

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
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
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
