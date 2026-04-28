'use client';

import { useApp } from '@/contexts/AppContext';
import { useState } from 'react';
import { ActiveAlertPayload } from '@/lib/store';

export default function SimulateAlert() {
  const { state } = useApp();
  
  const [crisisType, setCrisisType] = useState('FIRE');
  const [floor, setFloor] = useState(3);
  const [zone, setZone] = useState('B');
  const [cameraId, setCameraId] = useState('CAM_FLOOR3');
  const [internetOn, setInternetOn] = useState(true);
  
  const [firing, setFiring] = useState(false);

  const handleSimulate = async () => {
    setFiring(true);
    
    const payload: ActiveAlertPayload = {
      alert_type: crisisType,
      confidence: 0.94,
      camera_id: cameraId,
      floor: floor,
      zone: zone,
      sensor_triggered: crisisType === 'FIRE' ? ['smoke', 'thermal'] : [],
      gps: state.config.gps,
      timestamp: new Date().toISOString(),
      footage_available: true,
      internet_status: internetOn ? 'online' : 'offline',
      device_id: 'SIMULATOR',
      source: 'Simulated'
    };

    await fetch('/api/alert/incoming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    setTimeout(() => setFiring(false), 1000);
  };

  const inputClass = "w-full bg-surface-container-lowest dark:bg-surface-container-lowest border border-outline-variant/50 dark:border-outline-variant/30 text-on-surface px-4 py-3 rounded-lg focus:outline-none focus:border-error transition-colors text-sm";
  const labelClass = "text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block";

  return (
    <div className="animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <p className="text-error text-label-caps uppercase mb-1">System Testing / Sandbox</p>
          <h1 className="text-headline-lg text-on-surface">Crisis Simulator</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-6">
        
        {/* Input Form */}
        <div className="glass-panel p-6 rounded-xl border-l-4 border-error">
          <h2 className="text-label-caps text-on-surface uppercase tracking-widest mb-6 flex items-center gap-2 pb-3 border-b border-outline-variant/20 dark:border-outline-variant/20">
            <span className="material-symbols-outlined text-error text-sm">bug_report</span>
            Inject Test Payload
          </h2>
          
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Crisis Type Vector</label>
              <select className={inputClass + ' uppercase font-bold'}
                value={crisisType} onChange={e => setCrisisType(e.target.value)}>
                <option value="FIRE">Fire Hazard</option>
                <option value="MEDICAL EMERGENCY">Medical Emergency</option>
                <option value="EXPLOSION">Explosion</option>
                <option value="INTRUSION">Intrusion / Violence</option>
                <option value="LANDSLIDE">Structural Damage</option>
                <option value="WAR">Terror Threat</option>
                <option value="GAS LEAK">Bio / Gas Leak</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Origin Floor</label>
                <input type="number" className={inputClass}
                  value={floor} onChange={e => setFloor(parseInt(e.target.value))} />
              </div>
              <div>
                <label className={labelClass}>Sector Zone</label>
                <input type="text" className={inputClass + ' uppercase'}
                  value={zone} onChange={e => setZone(e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Triggering Node</label>
              <select className={inputClass}
                value={cameraId} onChange={e => setCameraId(e.target.value)}>
                {state.cameras.map(c => <option key={c.id} value={c.id}>{c.id} (Floor {c.floor})</option>)}
                {state.cameras.length === 0 && <option value="CAM_TEST">Test Node</option>}
              </select>
            </div>

            <div>
              <label className={labelClass}>Network Status Simulation</label>
              <div className="flex gap-3">
                <button onClick={() => setInternetOn(true)} className={`flex-1 py-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  internetOn ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(var(--color-primary),0.2)]' : 'bg-surface-container dark:bg-surface-container-high border-outline-variant/30 dark:border-outline-variant/20 text-on-surface-variant hover:text-on-surface'
                }`}>
                  <span className="material-symbols-outlined text-sm">cloud</span> Cloud Online
                </button>
                <button onClick={() => setInternetOn(false)} className={`flex-1 py-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  !internetOn ? 'bg-error/10 border-error text-error shadow-[0_0_15px_rgba(186,26,26,0.2)]' : 'bg-surface-container dark:bg-surface-container-high border-outline-variant/30 dark:border-outline-variant/20 text-on-surface-variant hover:text-on-surface'
                }`}>
                  <span className="material-symbols-outlined text-sm">satellite_alt</span> GSM Fallback
                </button>
              </div>
            </div>

            <button onClick={handleSimulate} disabled={firing} className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
              firing ? 'bg-error/50 text-on-surface border border-error cursor-wait' : 'bg-error hover:bg-error/80 text-on-error shadow-[0_0_20px_rgba(186,26,26,0.4)] active:scale-[0.98]'
            }`}>
              <span className="material-symbols-outlined text-2xl">{firing ? 'hourglass_empty' : 'play_arrow'}</span>
              {firing ? 'Injecting Payload...' : 'Fire Simulated Alert'}
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="bg-slate-950 dark:bg-[#050a14] border border-outline-variant/20 dark:border-outline-variant/20 rounded-xl p-5 font-mono text-xs overflow-hidden flex flex-col relative h-[600px]">
          <div className="absolute inset-0 scanline pointer-events-none opacity-30"></div>
          <div className="text-[10px] text-primary mb-4 flex justify-between items-center border-b border-primary/20 dark:border-primary/20 pb-3 relative z-10 font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">terminal</span>
              Payload Preview Buffer
            </div>
            <span className="animate-pulse flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block"></span> Ready</span>
          </div>
          <pre className="text-primary/80 dark:text-primary/90 overflow-y-auto custom-scrollbar flex-1 relative z-10 leading-relaxed whitespace-pre-wrap">
{`{
  "alert_type": "${crisisType}",
  "confidence": 0.94,
  "camera_id": "${cameraId}",
  "floor": ${floor},
  "zone": "${zone}",
  "sensor_triggered": [${crisisType === 'FIRE' ? '"smoke", "thermal"' : ''}],
  "gps": { 
    "lat": ${state.config.gps.lat}, 
    "lng": ${state.config.gps.lng} 
  },
  "timestamp": "${new Date().toISOString()}",
  "footage_available": true,
  "internet_status": "${internetOn ? 'online' : 'offline'}",
  "device_id": "SIMULATOR"
}`}
          </pre>
          <div className="mt-4 pt-3 border-t border-primary/20 dark:border-primary/20 text-on-surface-variant flex items-center gap-2 relative z-10 text-[11px]">
            <span className="text-primary animate-pulse">▌</span> Awaiting execution...
          </div>
        </div>

      </div>
    </div>
  );
}
