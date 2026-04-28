'use client';

import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';

export function TopBar() {
  const { state, isRPi5Online } = useApp();
  const { config } = state;
  const router = useRouter();

  const handleMobileMenu = () => {
    if (typeof window !== 'undefined' && (window as any).__rapidshield_toggle_mobile_menu) {
      (window as any).__rapidshield_toggle_mobile_menu();
    }
  };

  return (
    <header className="h-14 border-b border-outline-variant/30 dark:border-outline-variant/30 bg-surface-container-lowest/90 dark:bg-[#0a0e1a]/90 backdrop-blur-md flex justify-between items-center px-4 md:px-6 sticky top-0 z-30 shrink-0 transition-colors duration-300">
      {/* Left: Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button 
          onClick={handleMobileMenu}
          className="md:hidden p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-on-surface-variant">menu</span>
        </button>

        {/* Mobile brand */}
        <div className="md:hidden flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          <span className="font-black tracking-widest text-primary text-sm uppercase">RapidShield</span>
        </div>
        
        {/* Desktop breadcrumb */}
        <div className="hidden md:flex text-label-caps text-on-surface-variant items-center gap-2">
          <span className="material-symbols-outlined text-sm text-primary">home_work</span>
          <span className="font-bold">{config.name.toUpperCase()}</span>
          <span className="text-outline-variant">/</span>
          <span>{config.type.toUpperCase()}</span>
        </div>
      </div>
      
      {/* Right Actions */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* System status */}
        <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
          isRPi5Online 
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
            : 'bg-error/10 text-error border border-error/20'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isRPi5Online ? 'bg-emerald-500 animate-pulse' : 'bg-error'}`}></span>
          {isRPi5Online ? 'Operational' : 'Offline'}
        </div>

        {/* Mobile status dot */}
        <span className={`md:hidden w-2 h-2 rounded-full ${isRPi5Online ? 'bg-emerald-500 animate-pulse' : 'bg-error'}`}></span>
        
        {/* Notifications */}
        <button className="relative p-1.5 rounded-lg hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          {state.logs.length > 0 && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-secondary-container dark:bg-error"></span>
          )}
        </button>

        {/* Logout / Reset (Testing) */}
        <button 
          onClick={() => {
            localStorage.removeItem('rapidshield_auth');
            localStorage.removeItem('rapidshield_setup_complete');
            localStorage.removeItem('rapidshield_emergency_contacts');
            router.push('/login');
          }}
          className="relative p-1.5 rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-colors flex items-center gap-1"
          title="Reset & Logout (Testing Phase)"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="hidden md:inline text-xs font-bold uppercase tracking-wider">Reset</span>
        </button>
      </div>
    </header>
  );
}
