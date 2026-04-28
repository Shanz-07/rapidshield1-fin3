'use client';

import { useApp } from '@/contexts/AppContext';
import { useState } from 'react';
import { Camera as CameraType, Sensor } from '@/lib/store';

export default function AddDevices() {
  const { state, updateState, isRPi5Online } = useApp();

  const cameras = state.cameras;
  const sensors = state.sensors;
  const stats = state.rpi5Stats;

  const formatUptime = (seconds: number) => {
    if (seconds === 0) return '—';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}D ${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M`;
  };

  const memPercent = stats.memTotalMB > 0 ? Math.round((stats.memUsedMB / stats.memTotalMB) * 100) : 0;
  const memUsedGB = (stats.memUsedMB / 1024).toFixed(1);
  const memTotalGB = (stats.memTotalMB / 1024).toFixed(0);
  const tempPercent = Math.min(Math.round((stats.tempC / 80) * 100), 100); // 80°C = 100%

  const [newCam, setNewCam] = useState<Partial<CameraType> & { customName?: string }>({
    customName: '',
    floor: 1,
    zone: 'A',
    rtspUrl: ''
  });

  const [newSensor, setNewSensor] = useState<Partial<Sensor>>({
    type: 'smoke',
    floor: 1,
    zone: 'A'
  });

  const handleAddCam = async () => {
    if (!newCam.rtspUrl) return;
    let camName = newCam.customName?.trim() || `CAM_FLOOR${newCam.floor || 1}`;
    if (cameras.some(c => c.id === camName)) {
      camName = `${camName}_${Date.now().toString().slice(-4)}`;
    }
    const cam: CameraType = {
      id: camName,
      floor: Number(newCam.floor) || 1,
      zone: newCam.zone || 'A',
      rtspUrl: newCam.rtspUrl!
    };
    const updatedCameras = [...cameras, cam];
    await updateState('UPDATE_CAMERAS', { cameras: updatedCameras });
    setNewCam({ customName: '', floor: 1, zone: 'A', rtspUrl: '' });
  };

  const handleRemoveCam = async (id: string) => {
    const updatedCameras = cameras.filter(c => c.id !== id);
    await updateState('UPDATE_CAMERAS', { cameras: updatedCameras });
  };

  const handleAddSensor = async () => {
    const sensor: Sensor = {
      id: `SENS_${Date.now().toString().slice(-4)}`,
      type: newSensor.type as any,
      floor: Number(newSensor.floor) || 1,
      zone: newSensor.zone || 'A',
      status: 'ok'
    };
    const updatedSensors = [...sensors, sensor];
    await updateState('UPDATE_SENSORS', { sensors: updatedSensors });
    setNewSensor({ type: 'smoke', floor: 1, zone: 'A' });
  };

  const handleRemoveSensor = async (id: string) => {
    const updatedSensors = sensors.filter(s => s.id !== id);
    await updateState('UPDATE_SENSORS', { sensors: updatedSensors });
  };

  const inputClass = "w-full bg-surface-container-lowest dark:bg-surface-container-lowest border border-outline-variant/50 dark:border-outline-variant/30 text-on-surface px-3 py-2.5 rounded-lg focus:outline-none focus:border-primary dark:focus:border-primary transition-colors text-sm";
  const labelClass = "text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block";

  return (
    <div className="animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div>
          <p className="text-primary text-label-caps uppercase mb-2">System Status: Operational</p>
          <h1 className="text-headline-xl text-primary dark:text-on-surface">Fleet Overview</h1>
        </div>

      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
        
        {/* Main Content — Edge Server Node */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel rounded-xl p-6 overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 dark:bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20 dark:border-primary/20">
                  <span className="material-symbols-outlined text-primary">developer_board</span>
                </div>
                <div>
                  <h3 className="text-headline-md text-on-surface text-lg font-bold">RPi-EDGE-001</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${isRPi5Online ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Uptime: {formatUptime(stats.uptimeSeconds)}</p>
                  </div>
                </div>
              </div>
              <div className="px-3 py-1.5 bg-primary/5 dark:bg-primary/10 rounded-full border border-primary/10 dark:border-primary/20">
                <p className="text-label-caps text-[10px] text-primary">IP: {stats.ip}</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-surface-container dark:bg-surface-container-high rounded-lg p-4 border border-outline-variant/20 dark:border-outline-variant/20">
                <p className="text-label-caps text-[10px] text-on-surface-variant mb-1">CPU Load</p>
                <p className="text-headline-lg text-on-surface text-2xl font-bold">{stats.cpuPercent}%</p>
                <div className="w-full bg-surface-container-highest h-1 rounded-full mt-2">
                  <div className="bg-primary h-1 rounded-full" style={{ width: `${stats.cpuPercent}%` }}></div>
                </div>
              </div>
              <div className="bg-surface-container dark:bg-surface-container-high rounded-lg p-4 border border-outline-variant/20 dark:border-outline-variant/20">
                <p className="text-label-caps text-[10px] text-on-surface-variant mb-1">Memory</p>
                <p className="text-headline-lg text-on-surface text-2xl font-bold">{memUsedGB}<span className="text-sm font-normal text-on-surface-variant">/{memTotalGB}GB</span></p>
                <div className="w-full bg-surface-container-highest h-1 rounded-full mt-2">
                  <div className="bg-primary/60 h-1 rounded-full" style={{ width: `${memPercent}%` }}></div>
                </div>
              </div>
              <div className="bg-surface-container dark:bg-surface-container-high rounded-lg p-4 border border-outline-variant/20 dark:border-outline-variant/20">
                <p className="text-label-caps text-[10px] text-on-surface-variant mb-1">Temp</p>
                <p className={`text-headline-lg text-2xl font-bold ${stats.tempC > 70 ? 'text-error' : 'text-secondary'}`}>{stats.tempC}°C</p>
                <div className="w-full bg-surface-container-highest h-1 rounded-full mt-2">
                  <div className="bg-secondary-container dark:bg-tertiary-container h-1 rounded-full" style={{ width: `${tempPercent}%` }}></div>
                </div>
              </div>
            </div>

            {/* Telemetry Chart Placeholder */}
            <div className="h-32 bg-slate-900 dark:bg-surface-container-lowest rounded-lg relative overflow-hidden flex items-end">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(79, 84, 180, 0.5) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 100">
                <path d="M0 80 Q 50 20, 100 70 T 200 40 T 300 80 T 400 30 V 100 H 0 Z" fill="url(#grad1)" fillOpacity="0.3"></path>
                <path d="M0 80 Q 50 20, 100 70 T 200 40 T 300 80 T 400 30" fill="none" stroke="currentColor" className="text-primary" strokeWidth="2"></path>
                <defs>
                  <linearGradient id="grad1" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#4f54b4', stopOpacity: 1 }}></stop>
                    <stop offset="100%" style={{ stopColor: '#4f54b4', stopOpacity: 0 }}></stop>
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute top-2 left-4 text-white/50 text-label-caps text-[8px]">Core Telemetry Stream</div>
            </div>
          </div>

          {/* Registered Devices List */}
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/20 dark:border-outline-variant/20 flex justify-between items-center bg-surface-container-low/50 dark:bg-surface-container-lowest/50">
              <h3 className="text-label-caps text-on-surface uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">list_alt</span>
                Registered Nodes
              </h3>
              <span className="text-[10px] text-on-surface-variant font-bold">{cameras.length + sensors.length} Total</span>
            </div>
            <div className="divide-y divide-outline-variant/10 dark:divide-outline-variant/20 max-h-[300px] overflow-y-auto custom-scrollbar">
              {cameras.map(cam => (
                <div key={cam.id} className="flex justify-between items-center px-5 py-3 hover:bg-surface-container/50 dark:hover:bg-surface-container-high/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-lg">videocam</span>
                    <div>
                      <div className="text-sm font-bold text-on-surface">{cam.id}</div>
                      <div className="text-[10px] text-on-surface-variant">Floor {cam.floor} • Zone {cam.zone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-bold uppercase">Online</span>
                    <button onClick={() => handleRemoveCam(cam.id)} className="text-on-surface-variant hover:text-error transition-colors"><span className="material-symbols-outlined text-lg">delete</span></button>
                  </div>
                </div>
              ))}
              {sensors.map(s => (
                <div key={s.id} className="flex justify-between items-center px-5 py-3 hover:bg-surface-container/50 dark:hover:bg-surface-container-high/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-tertiary dark:text-tertiary text-lg">sensors</span>
                    <div>
                      <div className="text-sm font-bold text-on-surface uppercase">{s.type} Sensor</div>
                      <div className="text-[10px] text-on-surface-variant">Floor {s.floor} • Zone {s.zone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-bold uppercase">Active</span>
                    <button onClick={() => handleRemoveSensor(s.id)} className="text-on-surface-variant hover:text-error transition-colors"><span className="material-symbols-outlined text-lg">delete</span></button>
                  </div>
                </div>
              ))}
              {cameras.length === 0 && sensors.length === 0 && (
                <div className="text-center py-8 text-sm text-on-surface-variant">No devices registered yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Configuration Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Add Camera */}
          <div className="glass-panel p-5 rounded-xl">
            <h3 className="text-label-caps text-on-surface uppercase tracking-widest mb-5 flex items-center gap-2 pb-3 border-b border-outline-variant/20 dark:border-outline-variant/20">
              <span className="material-symbols-outlined text-primary text-sm">videocam</span>
              Add Camera Node
            </h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Node ID</label>
                <input type="text" placeholder="e.g. CAM_LOBBY" className={inputClass}
                  value={newCam.customName || ''} onChange={e => setNewCam({...newCam, customName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Floor</label>
                  <input type="number" min="1" className={inputClass}
                    value={newCam.floor || ''} onChange={e => setNewCam({...newCam, floor: parseInt(e.target.value) || 1})} />
                </div>
                <div>
                  <label className={labelClass}>Zone</label>
                  <input type="text" className={inputClass}
                    value={newCam.zone} onChange={e => setNewCam({...newCam, zone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className={labelClass}>RTSP Stream URL</label>
                <input type="text" placeholder="http://192.168.x.x/video" className={inputClass}
                  value={newCam.rtspUrl} onChange={e => setNewCam({...newCam, rtspUrl: e.target.value})} />
              </div>
              <button onClick={handleAddCam} className="w-full btn-premium text-white py-2.5 rounded-lg text-label-caps text-xs flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all">
                <span className="material-symbols-outlined text-sm">add</span> Provision Camera
              </button>
            </div>
          </div>

          {/* Add Sensor */}
          <div className="glass-panel p-5 rounded-xl">
            <h3 className="text-label-caps text-on-surface uppercase tracking-widest mb-5 flex items-center gap-2 pb-3 border-b border-outline-variant/20 dark:border-outline-variant/20">
              <span className="material-symbols-outlined text-primary text-sm">sensors</span>
              Add Sensor Node
            </h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Sensor Type</label>
                <select className={inputClass + ' uppercase'}
                  value={newSensor.type} onChange={e => setNewSensor({...newSensor, type: e.target.value as any})}>
                  <option value="smoke">Smoke</option>
                  <option value="thermal">Thermal</option>
                  <option value="vibration">Vibration</option>
                  <option value="motion">Motion</option>
                  <option value="gas">Gas</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Floor</label>
                  <input type="number" min="1" className={inputClass}
                    value={newSensor.floor || ''} onChange={e => setNewSensor({...newSensor, floor: parseInt(e.target.value) || 1})} />
                </div>
                <div>
                  <label className={labelClass}>Zone</label>
                  <input type="text" className={inputClass}
                    value={newSensor.zone} onChange={e => setNewSensor({...newSensor, zone: e.target.value})} />
                </div>
              </div>
              <button onClick={handleAddSensor} className="w-full py-2.5 bg-surface-container dark:bg-surface-container-high border border-outline-variant/30 dark:border-outline-variant/20 rounded-lg text-label-caps text-xs text-on-surface font-bold flex justify-center items-center gap-2 hover:bg-surface-container-high dark:hover:bg-surface-container-highest transition-colors">
                <span className="material-symbols-outlined text-sm">add</span> Provision Sensor
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
