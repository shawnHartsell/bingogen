import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProvider } from "@/components/AppProvider";
import { CardSidebar } from "@/components/CardSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { THEME_STORAGE_KEY } from "@/lib/theme";
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

// Dark is the default appearance, so the server always renders <html
// class="dark">. This blocking, synchronous script runs before first paint
// and removes the class for a returning user who chose light mode -
// avoiding a dark->light flash without needing a client-only render pass.
const themeBootstrapScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"){document.documentElement.classList.remove("dark");}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <AppProvider>
          <div className="sm:flex">
            <CardSidebar />
            <div className="min-w-0 flex-1">
              <div className="flex justify-end px-4 pt-4">
                <ThemeToggle />
              </div>
              {children}
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
