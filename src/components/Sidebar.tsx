'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useState } from 'react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: 'dashboard' },
  { name: 'Incident Logs', href: '/logs', icon: 'description' },
  { name: 'Devices', href: '/devices', icon: 'developer_board' },
  { name: 'Speakers', href: '/speakers', icon: 'campaign' },
  { name: 'Personnel', href: '/employees', icon: 'badge' },
  { name: 'Simulator', href: '/simulate', icon: 'science' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isRPi5Online } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      {/* Brand Header */}
      <div className="p-6 border-b border-outline-variant/30 dark:border-outline-variant/30 relative overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-primary/10 dark:bg-primary-container/20 border border-primary/20 dark:border-primary-container/30 flex items-center justify-center rounded-lg">
            <span className="material-symbols-outlined text-primary dark:text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-widest text-primary dark:text-primary uppercase leading-none">RAPIDSHIELD</h1>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mt-1">Command Center</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold">
          <span className={`w-2 h-2 rounded-full ${isRPi5Online ? 'bg-emerald-500 animate-pulse' : 'bg-error'}`}></span>
          <span className={isRPi5Online ? 'text-emerald-600 dark:text-emerald-400' : 'text-error'}>
            {isRPi5Online ? 'SYSTEM OPERATIONAL' : 'NODE OFFLINE'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="px-3 mb-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Navigation</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary font-bold shadow-sm' 
                  : 'text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >{item.icon}</span>
              <span className="text-sm tracking-wide">{item.name}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-5 rounded-full bg-primary"></span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle + Profile */}
      <div className="p-4 border-t border-outline-variant/30 dark:border-outline-variant/30 space-y-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-container dark:bg-surface-container-high hover:bg-surface-container-high dark:hover:bg-surface-container-highest transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-lg text-on-surface-variant">
              {theme === 'dark' ? 'dark_mode' : 'light_mode'}
            </span>
            <span className="text-sm text-on-surface-variant font-medium">
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>
          {/* Toggle Switch */}
          <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${theme === 'dark' ? 'bg-primary-container' : 'bg-outline-variant'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${theme === 'dark' ? 'translate-x-5.5' : 'translate-x-0.5'}`}></div>
          </div>
        </button>

        {/* Operator Profile */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 rounded-full bg-primary-container dark:bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary dark:text-on-primary-container text-lg">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-on-surface truncate">Operator</div>
            <div className="text-[10px] text-on-surface-variant font-medium">Sector 7G</div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-surface-container-lowest dark:bg-[#060e20] border-r border-outline-variant/40 dark:border-outline-variant/30 h-screen fixed left-0 top-0 z-40 transition-colors duration-300">
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)}></div>
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-surface-container-lowest dark:bg-[#060e20] border-r border-outline-variant/40 dark:border-outline-variant/30 flex flex-col animate-in slide-in-from-left duration-300 shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Mobile hamburger trigger (exposed via a global setter) */}
      <MobileMenuButton open={mobileOpen} setOpen={setMobileOpen} />
    </>
  );
}

// This component renders nothing but exposes the setMobileOpen function via window
// so the TopBar can trigger it
function MobileMenuButton({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  // Expose through a global so TopBar can call it
  if (typeof window !== 'undefined') {
    (window as any).__rapidshield_toggle_mobile_menu = () => setOpen(!open);
  }
  return null;
}
