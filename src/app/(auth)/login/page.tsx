'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if an account exists
    const authData = localStorage.getItem('rapidshield_auth');
    if (authData) {
      setIsFirstTime(false);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Testing Mode: Accept ANY random values
    if (!username || !password) {
      setError('Operator ID and Passcode are required to authorize access.');
      return;
    }

    if (isFirstTime) {
      // Create Account with whatever is entered
      const newAuth = { username, password };
      localStorage.setItem('rapidshield_auth', JSON.stringify(newAuth));
      router.push('/setup');
    } else {
      // Testing Mode Bypass: Just accept the login and navigate
      const setupComplete = localStorage.getItem('rapidshield_setup_complete');
      if (setupComplete) {
        router.push('/');
      } else {
        router.push('/setup');
      }
    }
  };

  if (isLoading) {
    return <div className="animate-pulse flex justify-center text-on-background">Establishing Secure Connection...</div>;
  }

  return (
    <div className="relative w-full max-w-md">
      {/* Animated background orbs */}
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-20 blur-3xl animate-pulse" style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)' }} />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full opacity-15 blur-3xl animate-pulse" style={{ background: 'radial-gradient(circle, var(--color-tertiary) 0%, transparent 70%)', animationDelay: '1s' }} />

      {/* Login Card */}
      <div className="relative auth-card rounded-3xl p-8 md:p-10 w-full flex flex-col items-center overflow-hidden" style={{ animation: 'fade-in-up 0.6s ease-out forwards' }}>
        
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{ background: 'linear-gradient(90deg, var(--color-primary), var(--color-tertiary), var(--color-primary))' }} />

        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-3 mb-8 relative z-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-tertiary))', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <span className="material-symbols-outlined text-4xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-widest text-primary uppercase leading-none">RAPIDSHIELD</h1>
            <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-[0.2em] mt-2">Crisis Response Hub</p>
          </div>
        </div>

        <div className="w-full mb-6 relative z-10">
          <h2 className="text-xl font-bold text-on-surface text-center">
            {isFirstTime ? 'Initialize Command Center' : 'Operator Authorization'}
          </h2>
          <p className="text-on-surface-variant text-center mt-2 text-sm leading-relaxed max-w-xs mx-auto">
            {isFirstTime 
              ? 'Create your master credentials to secure the central crisis response hub.' 
              : 'Enter your credentials to access real-time critical infrastructure data.'}
          </p>
        </div>

        {error && (
          <div className="relative z-10 w-full bg-error-container text-on-error-container p-3 rounded-xl mb-5 text-sm font-medium text-center border border-error/20 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-5 relative z-10">
          {/* Operator ID */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface ml-1 flex justify-between">
              <span>Operator ID</span>
              <span className="text-xs text-on-surface-variant/70 font-normal italic">Any value works</span>
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-focus-within:text-primary transition-colors">badge</span>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-input w-full rounded-xl pl-12 pr-4 py-3.5 text-on-surface focus:outline-none transition-all font-mono text-sm"
                placeholder="e.g. ALPHA_COMMAND_01"
              />
            </div>
          </div>

          {/* Security Passcode */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface ml-1 flex justify-between">
              <span>Security Passcode</span>
              <span className="text-xs text-on-surface-variant/70 font-normal italic">Any value works</span>
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-focus-within:text-primary transition-colors">lock</span>
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input w-full rounded-xl pl-12 pr-12 py-3.5 text-on-surface focus:outline-none transition-all font-mono text-sm tracking-widest"
                placeholder="••••••••••••"
              />
              {/* Hold to reveal */}
              <button
                type="button"
                onMouseDown={() => setShowPassword(true)}
                onMouseUp={() => setShowPassword(false)}
                onMouseLeave={() => setShowPassword(false)}
                onTouchStart={() => setShowPassword(true)}
                onTouchEnd={() => setShowPassword(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-on-surface-variant hover:text-primary transition-colors select-none"
                tabIndex={-1}
                title="Hold to reveal"
              >
                <span className="material-symbols-outlined text-lg leading-none">
                  {showPassword ? 'visibility' : 'visibility_off'}
                </span>
              </button>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full auth-btn-primary text-white font-bold py-4 rounded-xl mt-6 flex items-center justify-center gap-2 text-base"
          >
            {isFirstTime ? 'Establish Secure Connection' : 'Authorize & Enter'}
            <span className="material-symbols-outlined text-xl">
              {isFirstTime ? 'satellite_alt' : 'verified_user'}
            </span>
          </button>
          
          <p className="text-center text-xs text-on-surface-variant/50 font-mono mt-4">
            SECURE ENCLAVE ACTIVE • {new Date().getFullYear()}
          </p>
        </form>
        
      </div>
    </div>
  );
}
