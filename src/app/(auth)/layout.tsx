'use client';

import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex-1 w-full h-full bg-background overflow-y-auto custom-scrollbar relative transition-colors duration-300 flex flex-col">
      
      {/* Test Navigation Bar - Fixed at top left */}
      <div className="fixed top-6 left-6 z-50 flex gap-2">
        <Link href="/login" className="px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-lg text-sm font-bold text-on-surface shadow-md transition-colors border border-outline-variant">
          To Login
        </Link>
        <Link href="/setup" className="px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-lg text-sm font-bold text-on-surface shadow-md transition-colors border border-outline-variant">
          To Setup
        </Link>
        <Link href="/" className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg text-sm font-bold shadow-md transition-colors">
          To Main Dashboard
        </Link>
      </div>

      {/* Theme Toggle Button — sticky top right */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-3 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors shadow-md flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-on-surface">
          {theme === 'dark' ? 'dark_mode' : 'light_mode'}
        </span>
      </button>

      {/* Main Content Area — scrollable with vertical padding */}
      <main className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center flex-1 py-24 px-4">
        {children}
      </main>
    </div>
  );
}
