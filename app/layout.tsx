import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProvider } from "@/components/AppProvider";
import { CardSidebar } from "@/components/CardSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

// Runs before hydration/paint so a persisted "light" preference doesn't
// flash the default dark theme first. Kept tiny and dependency-free since
// it must ship as an inline, blocking script.
const themeInitScript = `
(function () {
  try {
    var theme = window.localStorage.getItem("bingogen.theme.v1");
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
    }
  } catch (e) {}
})();
`;

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
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <AppProvider>
          <div className="sm:flex">
            <CardSidebar />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
          <div className="fixed top-3 right-3 z-50">
            <ThemeToggle />
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
