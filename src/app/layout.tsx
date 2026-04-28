import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AlertOverlay } from "@/components/AlertOverlay";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "RapidShield | Crisis Response Coordination System",
  description: "AI-Powered Crisis Response Dashboard connected to RPi5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning className={`${spaceGrotesk.variable} bg-background text-on-background min-h-screen flex flex-col overflow-x-hidden font-[Space_Grotesk,sans-serif]`}>
        <ThemeProvider>
          <AppProvider>
            {children}
            <AlertOverlay />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
