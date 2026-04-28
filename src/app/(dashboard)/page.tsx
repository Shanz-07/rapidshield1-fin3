'use client';

import { useApp } from '@/contexts/AppContext';
import Link from 'next/link';

export default function LiveDashboard() {
  const { state, isRPi5Online } = useApp();
  const { config, cameras, sensors, logs, employees } = state;
  const stats = state.rpi5Stats;

  const memPercent = stats.memTotalMB > 0 ? Math.round((stats.memUsedMB / stats.memTotalMB) * 100) : 0;
  const memUsedGB = (stats.memUsedMB / 1024).toFixed(1);
  const memTotalGB = (stats.memTotalMB / 1024).toFixed(0);

  const onlineCameras = cameras.length;
  const activeSensors = sensors.length;

  const medicalCount = employees.filter(e => e.role.includes('Medical')).length;
  const securityCount = employees.filter(e => e.role.includes('Security')).length;
  const otherCount = employees.length - medicalCount - securityCount;

  return (
    <div className="animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <p className="text-primary text-label-caps uppercase mb-1">Command Center / Live</p>
          <h1 className="text-headline-lg text-on-surface">RAPID SHIELD <span className="text-primary font-light opacity-60">v4.0.2</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-panel px-4 py-2 flex items-center gap-2 rounded-lg">
            <span className="material-symbols-outlined text-primary text-[18px]">memory</span>
            <span className="text-xs font-bold text-on-surface-variant">{isRPi5Online ? 'RPi5 Connected' : 'RPi5 Offline'}</span>
          </div>
          <div className="glass-panel px-4 py-2 rounded-lg">
            <p className="text-[10px] text-on-surface-variant uppercase font-bold">Latency</p>
            <p className="text-primary text-headline-md text-base font-bold">{isRPi5Online ? '<50ms' : '—'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
        
        {/* Main Feed Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Video Feed Grid */}
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="relative">
              {cameras.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-outline-variant/20 dark:bg-surface-container-highest">
                  {cameras.slice(0, 4).map((cam, idx) => (
                    <div key={cam.id} className="relative aspect-video bg-slate-900 overflow-hidden group">
                      <div className="absolute inset-0 technical-grid opacity-20"></div>
                      {cam.rtspUrl.startsWith('http') ? (
                        <img 
                          src={`/api/camera-proxy?url=${encodeURIComponent(cam.rtspUrl)}`} 
                          alt={`Feed ${cam.id}`} 
                          className="absolute inset-0 w-full h-full object-cover mix-blend-screen grayscale-[20%] contrast-125"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl text-slate-700">videocam</span>
                        </div>
                      )}
                      {/* OSD */}
                      <div className="absolute top-2 left-2 flex items-center gap-2 text-[10px] font-bold">
                        <span className={`w-1.5 h-1.5 rounded-full ${isRPi5Online ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></span>
                        <span className="bg-black/50 backdrop-blur-sm px-2 py-0.5 text-white rounded">CAM_0{idx+1}</span>
                        <span className="bg-black/50 backdrop-blur-sm px-2 py-0.5 text-primary dark:text-primary rounded">Z-{cam.zone}</span>
                      </div>
                      {/* AI Bounding Box */}
                      <div className="absolute inset-x-8 inset-y-6 border-2 border-primary/30 dark:border-primary/40 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute -top-5 left-0 bg-primary dark:bg-primary-container text-white dark:text-on-primary-container text-[10px] px-2 py-0.5 font-bold uppercase">Subject Identified: Authorized</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="aspect-video bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center border border-dashed border-outline-variant">
                  <span className="material-symbols-outlined text-outline-variant text-4xl mb-2">videocam_off</span>
                  <div className="text-on-surface-variant text-xs font-bold">No Feeds Available</div>
                </div>
              )}
            </div>
            {/* Feed Status Bar */}
            <div className="flex items-center justify-between p-3 bg-surface-container-low dark:bg-surface-container-lowest text-[10px] font-bold text-on-surface-variant uppercase">
              <div className="flex items-center gap-4">
                <span>{onlineCameras} Active Feeds</span>
                <span className="text-primary">YOLOv8 Nano</span>
              </div>
              <div className="font-mono">Codec: H.265 / HEVC</div>
            </div>
          </div>

          {/* Sensor Data Ribbon */}
          <div className="glass-panel p-5 rounded-xl">
            <h3 className="text-label-caps text-on-surface uppercase tracking-widest mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">sensors</span>
              Environment
            </h3>
            <div className="flex flex-col gap-4">
              {sensors.length > 0 ? sensors.map(sensor => {
                const icon = sensor.type === 'smoke' ? 'detector_smoke' : sensor.type === 'thermal' ? 'thermometer' : sensor.type === 'vibration' ? 'vibration' : sensor.type === 'motion' ? 'motion_sensor_active' : sensor.type === 'gas' ? 'air' : 'sensors';
                const statusColor = sensor.status === 'triggered' ? 'text-error' : sensor.status === 'warning' ? 'text-amber-500' : 'text-primary';
                const statusBg = sensor.status === 'triggered' ? 'bg-error/10' : sensor.status === 'warning' ? 'bg-amber-500/10' : 'bg-primary/10';

                return (
                  <div key={sensor.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full ${statusBg} flex items-center justify-center`}>
                        <span className={`material-symbols-outlined ${statusColor}`}>{icon}</span>
                      </div>
                      <div>
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold">{sensor.type} Sensor</p>
                        <p className="text-sm font-bold text-on-surface">Floor {sensor.floor} · Zone {sensor.zone}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${
                      sensor.status === 'triggered' ? 'bg-error/10 text-error border-error/20 animate-pulse' 
                      : sensor.status === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                      : 'bg-primary/10 text-primary border-primary/20'
                    }`}>{sensor.status}</span>
                  </div>
                );
              }) : (
                <div className="text-xs text-on-surface-variant text-center py-4">No sensors registered</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Info Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Live Alerts */}
          <div className="glass-panel rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-outline-variant/20 dark:border-outline-variant/30 flex justify-between items-center bg-surface-container-low/50 dark:bg-surface-container-lowest/50">
              <h3 className="text-label-caps text-on-surface uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">notifications_active</span>
                Live Alerts
              </h3>
              {logs.length > 0 && (
                <span className="bg-error/10 text-error text-[10px] px-2 py-0.5 rounded font-bold border border-error/20">{logs.length} Active</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto max-h-[350px] custom-scrollbar">
              {logs.length > 0 ? logs.slice(0, 5).map((log, i) => (
                <div key={log.id} className={`p-4 border-b border-outline-variant/10 dark:border-outline-variant/20 hover:bg-surface-container-high/30 transition-colors ${i === 0 ? 'bg-error/5' : ''}`}>
                  <div className="flex justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${i === 0 ? 'text-error' : 'text-primary'}`}>
                      {log.type ?? 'Unknown'}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm font-bold text-on-surface">
                    Floor {log.floor ?? '?'}, Zone {log.zone ?? '?'}
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    {log.internalNotified ?? 0} personnel notified.
                  </p>
                </div>
              )) : (
                <div className="p-6 text-center text-sm text-on-surface-variant">No recent events</div>
              )}
            </div>
            {logs.length > 0 && (
              <div className="p-3 bg-surface-container-low/50 dark:bg-surface-container-lowest/50 text-center">
                <Link href="/logs" className="text-primary text-[10px] font-bold uppercase hover:underline">View All Incident Logs</Link>
              </div>
            )}
          </div>

          {/* System Health */}
          <div className="glass-panel p-5 rounded-xl">
            <h3 className="text-label-caps text-on-surface uppercase tracking-widest mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">monitoring</span>
              System Health
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-on-surface-variant uppercase">CPU Load</span>
                  <span className="text-primary">{stats.cpuPercent}%</span>
                </div>
                <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${stats.cpuPercent}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-on-surface-variant uppercase">Memory</span>
                  <span className="text-primary">{memUsedGB}/{memTotalGB}GB</span>
                </div>
                <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-secondary dark:bg-secondary rounded-full" style={{ width: `${memPercent}%` }}></div>
                </div>
              </div>
              <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center text-xs">
                <span className="text-on-surface-variant font-bold uppercase">Status</span>
                <span className={`px-3 py-1 rounded-lg border font-bold uppercase text-[10px] ${isRPi5Online ? 'bg-primary/10 text-primary border-primary/20' : 'bg-error/10 text-error border-error/20'}`}>{isRPi5Online ? 'Nominal' : 'Offline'}</span>
              </div>
            </div>
          </div>

          {/* Personnel Status */}
          <div className="glass-panel p-5 rounded-xl">
            <h3 className="text-label-caps text-on-surface uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">group</span>
              Active Responders
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-surface-container dark:bg-surface-container-high rounded-lg border-l-4 border-error">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-error">medical_services</span>
                  <span className="text-on-surface font-bold text-sm">Medical</span>
                </div>
                <span className="font-bold text-sm text-error">{medicalCount}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface-container dark:bg-surface-container-high rounded-lg border-l-4 border-primary">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">local_police</span>
                  <span className="text-on-surface font-bold text-sm">Security</span>
                </div>
                <span className="font-bold text-sm text-primary">{securityCount}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface-container dark:bg-surface-container-high rounded-lg border-l-4 border-outline">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-outline">engineering</span>
                  <span className="text-on-surface font-bold text-sm">Facility</span>
                </div>
                <span className="font-bold text-sm text-on-surface-variant">{otherCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
