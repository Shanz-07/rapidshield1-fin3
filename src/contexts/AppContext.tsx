'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ActiveAlertPayload, Camera, Employee, Sensor, SpeakerDevice, SOSDispatch, VenueConfig, AlertLog, RPi5Stats } from '@/lib/store';

interface AppState {
  config: VenueConfig;
  employees: Employee[];
  cameras: Camera[];
  sensors: Sensor[];
  speakers: SpeakerDevice[];
  sosDispatches: SOSDispatch[];
  logs: AlertLog[];
  activeAlert: ActiveAlertPayload | null;
  rpi5LastHeartbeat: number;
  rpi5Stats: RPi5Stats;
}

interface AppContextType {
  state: AppState;
  updateState: (type: string, payload: any) => Promise<void>;
  isRPi5Online: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    // Initial fetch
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        // We just need initial structure, SSE will overwrite
      });

    const eventSource = new EventSource('/api/sse');
    
    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed.type === 'STATE_UPDATE') {
        setState(parsed.state);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const updateState = async (type: string, payload: any) => {
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...payload })
    });
  };

  const triggerSOS = async (employeeId: string) => {
    await fetch('/api/sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId })
    });
  };

  const isRPi5Online = state ? (Date.now() - state.rpi5LastHeartbeat < 15000) : false; // 15 seconds tolerance

  if (!state) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading RapidShield Systems...</div>;

  return (
    <AppContext.Provider value={{ state, updateState, isRPi5Online }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

