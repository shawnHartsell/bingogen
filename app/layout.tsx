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

// Runs before hydration to avoid a flash of the wrong theme: the server
// always renders with the "dark" class (matching the default in
// hooks/useTheme.ts), so this only needs to *remove* it when the stored
// preference is "light". suppressHydrationWarning on <html> below silences
// the resulting (expected) class mismatch warning.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("bingogen.theme.v1");if(t==="light"){document.documentElement.classList.remove("dark");}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <AppProvider>
          <header className="flex items-center justify-end border-b border-zinc-200 dark:border-zinc-800 px-4 py-2">
            <ThemeToggle />
          </header>
          <div className="sm:flex">
            <CardSidebar />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
