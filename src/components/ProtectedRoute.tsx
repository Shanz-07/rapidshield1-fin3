'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const authData = localStorage.getItem('rapidshield_auth');
      const setupData = localStorage.getItem('rapidshield_setup_complete');

      if (!authData) {
        // Not logged in
        router.push('/login');
      } else if (authData && !setupData && pathname !== '/setup') {
        // Logged in but setup not complete
        router.push('/setup');
      } else {
        // Authenticated and setup complete (or currently on setup page)
        setIsAuthenticated(true);
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (isChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}
