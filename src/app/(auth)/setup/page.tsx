'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface StationConfig {
  id: string;
  icon: string;
  label: string;
  description: string;
  color: string;
  name: string;
  location: string;
  phone: string;
  verified: boolean;
  verifying: boolean;
}

const defaultStations: StationConfig[] = [
  {
    id: 'hospital',
    icon: 'local_hospital',
    label: 'Nearby Hospital',
    description: 'Primary medical facility for emergency medical response and triage.',
    color: '#ef4444',
    name: '',
    location: '',
    phone: '',
    verified: false,
    verifying: false,
  },
  {
    id: 'police',
    icon: 'local_police',
    label: 'Nearby Police Station',
    description: 'Law enforcement unit for security incidents and crowd control.',
    color: '#3b82f6',
    name: '',
    location: '',
    phone: '',
    verified: false,
    verifying: false,
  },
  {
    id: 'shelter',
    icon: 'night_shelter',
    label: 'Nearby Shelter Camp',
    description: 'Emergency shelter for evacuees and displaced individuals.',
    color: '#f59e0b',
    name: '',
    location: '',
    phone: '',
    verified: false,
    verifying: false,
  },
  {
    id: 'fire',
    icon: 'fire_truck',
    label: 'Nearby Fire Station',
    description: 'Fire & rescue team for fire emergencies and hazmat incidents.',
    color: '#f97316',
    name: '',
    location: '',
    phone: '',
    verified: false,
    verifying: false,
  },
  {
    id: 'ambulance',
    icon: 'ambulance',
    label: 'Ambulance Service',
    description: 'Emergency medical transport for patient evacuation.',
    color: '#10b981',
    name: '',
    location: '',
    phone: '',
    verified: false,
    verifying: false,
  },
  {
    id: 'disaster',
    icon: 'emergency_home',
    label: 'Disaster Management Office',
    description: 'Central coordination body for multi-agency disaster response.',
    color: '#8b5cf6',
    name: '',
    location: '',
    phone: '',
    verified: false,
    verifying: false,
  },
];

export default function SetupPage() {
  const router = useRouter();
  const [stations, setStations] = useState<StationConfig[]>(defaultStations);
  const [saving, setSaving] = useState(false);

  const updateStation = (id: string, field: keyof StationConfig, value: string) => {
    setStations(prev =>
      prev.map(s => s.id === id ? { ...s, [field]: value, verified: false } : s)
    );
  };

  const handleVerify = async (id: string) => {
    const station = stations.find(s => s.id === id);
    if (!station) return;

    // Validate fields
    if (!station.name.trim() || !station.location.trim() || !station.phone.trim()) {
      return;
    }

    // Start verifying animation
    setStations(prev =>
      prev.map(s => s.id === id ? { ...s, verifying: true } : s)
    );

    // Simulate verification (1.5s)
    await new Promise(resolve => setTimeout(resolve, 1500));

    setStations(prev =>
      prev.map(s => s.id === id ? { ...s, verified: true, verifying: false } : s)
    );
  };

  const allVerified = stations.every(s => s.verified);
  const anyFilled = stations.some(s => s.name.trim() || s.location.trim() || s.phone.trim());

  const handleSave = async () => {
    setSaving(true);
    // Save station config to localStorage
    const stationData = stations.map(({ id, label, name, location, phone, verified }) => ({
      id, label, name, location, phone, verified
    }));
    localStorage.setItem('rapidshield_stations', JSON.stringify(stationData));
    localStorage.setItem('rapidshield_setup_complete', 'true');

    // Sync station phone numbers to server (so RPi5 can fetch them for SMS dispatch)
    try {
      await fetch('/api/config/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stations: stationData }),
      });
    } catch (e) {
      // Non-critical — stations are saved locally even if server sync fails
    }
    
    // Brief delay for the saving animation
    await new Promise(resolve => setTimeout(resolve, 800));
    router.push('/');
  };

  const isStationComplete = (s: StationConfig) => s.name.trim() && s.location.trim() && s.phone.trim();

  return (
    <div className="w-full max-w-3xl relative" style={{ animation: 'fade-in-up 0.6s ease-out forwards' }}>
      {/* Background orbs */}
      <div className="fixed -top-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)' }} />
      <div className="fixed -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, var(--color-tertiary) 0%, transparent 70%)' }} />

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-tertiary))', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          <span className="material-symbols-outlined text-3xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
        </div>
        <h1 className="text-3xl font-black tracking-widest text-primary uppercase leading-none">STATION SETUP</h1>
        <p className="text-on-surface-variant text-sm mt-3 max-w-lg mx-auto leading-relaxed">
          Configure emergency service stations for rapid crisis response. Enter the credentials for each nearby essential facility and verify connectivity.
        </p>
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mt-5">
          <span className="text-xs font-semibold text-on-surface-variant">
            {stations.filter(s => s.verified).length} / {stations.length} Verified
          </span>
          <div className="w-32 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${(stations.filter(s => s.verified).length / stations.length) * 100}%`,
                background: 'linear-gradient(90deg, var(--color-primary), var(--color-tertiary))'
              }}
            />
          </div>
        </div>
      </div>

      {/* Station Cards */}
      <div className="space-y-4">
        {stations.map((station, index) => (
          <div 
            key={station.id}
            className="auth-card rounded-2xl overflow-hidden transition-all duration-300"
            style={{ 
              animationDelay: `${index * 0.08}s`,
              animation: 'fade-in-up 0.5s ease-out forwards',
              opacity: 0,
              borderLeft: station.verified ? `3px solid ${station.color}` : '3px solid transparent'
            }}
          >
            {/* Station Header */}
            <div className="flex items-center gap-3 p-5 pb-0">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${station.color}18`, border: `1px solid ${station.color}30` }}
              >
                <span 
                  className="material-symbols-outlined text-xl"
                  style={{ color: station.color, fontVariationSettings: "'FILL' 1" }}
                >
                  {station.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-on-surface truncate">{station.label}</h3>
                  {station.verified && (
                    <span className="material-symbols-outlined text-base" style={{ color: '#10b981', fontVariationSettings: "'FILL' 1" }}>
                      verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant/70 truncate">{station.description}</p>
              </div>
              {station.verified && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: '#10b98118', color: '#10b981' }}>
                  Connected
                </span>
              )}
            </div>

            {/* Station Inputs */}
            <div className="p-5 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    Station Name
                  </label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors text-base">domain</span>
                    <input
                      type="text"
                      value={station.name}
                      onChange={e => updateStation(station.id, 'name', e.target.value)}
                      className="auth-input w-full rounded-lg pl-9 pr-3 py-2.5 text-on-surface text-sm focus:outline-none transition-all"
                      placeholder="e.g. City General Hospital"
                      disabled={station.verified}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    Location / Address
                  </label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors text-base">location_on</span>
                    <input
                      type="text"
                      value={station.location}
                      onChange={e => updateStation(station.id, 'location', e.target.value)}
                      className="auth-input w-full rounded-lg pl-9 pr-3 py-2.5 text-on-surface text-sm focus:outline-none transition-all"
                      placeholder="e.g. MG Road, Sector 12"
                      disabled={station.verified}
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    Phone Number
                  </label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors text-base">call</span>
                    <input
                      type="tel"
                      value={station.phone}
                      onChange={e => updateStation(station.id, 'phone', e.target.value)}
                      className="auth-input w-full rounded-lg pl-9 pr-3 py-2.5 text-on-surface text-sm focus:outline-none transition-all"
                      placeholder="e.g. +91-9876543210"
                      disabled={station.verified}
                    />
                  </div>
                </div>
              </div>

              {/* Verify Button */}
              <div className="mt-4 flex items-center justify-between">
                {station.verified ? (
                  <button
                    type="button"
                    onClick={() => setStations(prev => prev.map(s => s.id === station.id ? { ...s, verified: false } : s))}
                    className="text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Edit Credentials
                  </button>
                ) : (
                  <div />
                )}
                
                {!station.verified && (
                  <button
                    type="button"
                    onClick={() => handleVerify(station.id)}
                    disabled={!isStationComplete(station) || station.verifying}
                    className="verify-btn flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: isStationComplete(station) ? station.color : undefined,
                      color: isStationComplete(station) ? 'white' : undefined,
                      boxShadow: isStationComplete(station) ? `0 4px 14px ${station.color}40` : undefined,
                    }}
                  >
                    {station.verifying ? (
                      <>
                        <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                        Verifying...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">verified_user</span>
                        Verify
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Save & Enter */}
      <div className="mt-8 mb-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={!allVerified || saving}
          className="w-full auth-btn-primary text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
        >
          {saving ? (
            <>
              <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
              Initializing Dashboard...
            </>
          ) : (
            <>
              Save & Enter Command Center
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </>
          )}
        </button>
        {!allVerified && anyFilled && (
          <p className="text-center text-xs text-on-surface-variant/60 mt-3">
            Please verify all {stations.length} stations before proceeding to the dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
