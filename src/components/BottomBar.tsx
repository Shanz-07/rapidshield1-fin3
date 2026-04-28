'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomBar() {
  const pathname = usePathname();

  const links = [
    { href: '/', icon: 'dashboard', label: 'DASHBOARD' },
    { href: '/devices', icon: 'router', label: 'DEVICES' },
    { href: '/speakers', icon: 'campaign', label: 'COMMS' },
    { href: '/employees', icon: 'badge', label: 'PERSONNEL' },
    { href: '/simulate', icon: 'science', label: 'SIMULATE' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 w-full bg-surface-container-high/90 backdrop-blur-xl border-t border-primary-container/20 flex justify-around p-3 z-50">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
              isActive ? 'text-primary-container bg-primary-container/10' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">{link.icon}</span>
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
