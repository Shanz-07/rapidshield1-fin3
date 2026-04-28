'use client';

import { useApp } from '@/contexts/AppContext';
import { evaluateCrisis, getSpeakerAlertMessage } from '@/lib/routingBrain';
import { useEffect, useRef } from 'react';

export function AlertOverlay() {
  const { state, updateState } = useApp();
  const alert = state.activeAlert;
  const ttsSpoken = useRef(false);

  // Check if an actual SOS has been dispatched (employee pressed button)
  const sosDispatched = state.sosDispatches && state.sosDispatches.length > 0;

  // TTS voice alert
  useEffect(() => {
    if (alert && !ttsSpoken.current && typeof window !== 'undefined' && window.speechSynthesis) {
      ttsSpoken.current = true;
      const message = getSpeakerAlertMessage(alert.alert_type, alert.floor, alert.zone);
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.9;
      utterance.pitch = 0.8;
      utterance.volume = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
    if (!alert) {
      ttsSpoken.current = false;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  }, [alert]);

  if (!alert) return null;

  const routing = evaluateCrisis(alert, state.employees);

  const getAlertTheme = () => {
    const type = alert.alert_type.toUpperCase();
    if (['FIRE', 'EXPLOSION', 'WAR', 'BLAST', 'TERROR'].includes(type)) return { bg: 'bg-red-600', text: 'text-white', border: 'border-red-600', glow: 'shadow-[0_0_30px_rgba(220,38,38,0.5)]', icon: 'local_fire_department', alertColor: 'text-red-400' };
    if (['MEDICAL', 'MEDICAL EMERGENCY'].includes(type)) return { bg: 'bg-orange-600', text: 'text-white', border: 'border-orange-600', glow: 'shadow-[0_0_30px_rgba(234,88,12,0.5)]', icon: 'medical_services', alertColor: 'text-orange-400' };
    if (['INTRUSION', 'VIOLENCE'].includes(type)) return { bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-600', glow: 'shadow-[0_0_30px_rgba(124,58,237,0.5)]', icon: 'local_police', alertColor: 'text-violet-400' };
    if (['GAS', 'GAS LEAK'].includes(type)) return { bg: 'bg-amber-500', text: 'text-black', border: 'border-amber-500', glow: 'shadow-[0_0_30px_rgba(245,158,11,0.5)]', icon: 'coronavirus', alertColor: 'text-amber-400' };
    return { bg: 'bg-red-600', text: 'text-white', border: 'border-red-600', glow: 'shadow-[0_0_30px_rgba(220,38,38,0.5)]', icon: 'warning', alertColor: 'text-red-400' };
  };

  const theme = getAlertTheme();

  const handleCancel = () => {
    updateState('CANCEL_ALERT', {});
  };

  // Alert overlay is always dark-themed for maximum readability and urgency
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0a0e1a]/98 backdrop-blur-lg animate-in fade-in duration-300">
      <div className="absolute inset-0 technical-grid opacity-10 pointer-events-none"></div>

      {/* Top Banner */}
      <div className={`w-full py-3 px-6 flex items-center justify-between ${theme.bg} ${theme.text} relative z-10 ${theme.glow}`}>
        <div className="flex items-center space-x-4">
          <span className="material-symbols-outlined text-4xl animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>{theme.icon}</span>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wider uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">warning</span>
              {alert.alert_type} — Floor {alert.floor} / Zone {alert.zone}
            </h1>
            <p className="text-[11px] font-bold opacity-90 mt-1 uppercase tracking-wider">
              Source: {alert.source === 'RPi5' ? 'RPi5 Edge Inference' : 'Simulated Test'} • Confidence: {Math.round(alert.confidence * 100)}%
            </p>
          </div>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-2xl font-bold">{new Date(alert.timestamp).toLocaleTimeString()}</div>
          <div className="text-[11px] font-bold opacity-90 uppercase mt-1">Node: {alert.camera_id}</div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 p-4 md:p-6 h-full overflow-hidden relative z-10 max-w-[1800px] mx-auto w-full">
        {/* LEFT PANEL - Detection Info */}
        <div className={`md:col-span-3 bg-[#0d1220] border rounded-xl flex flex-col overflow-hidden ${theme.border}/30`}>
          <div className="p-4 border-b border-slate-800/50 flex items-center gap-2 bg-slate-900/50">
            <span className={`material-symbols-outlined text-sm ${theme.alertColor}`}>radar</span>
            <h2 className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Detection Telemetry</h2>
          </div>
          
          <div className="p-4 space-y-4 flex-1 flex flex-col">
            <div>
              <div className="text-[10px] text-slate-500 mb-1 font-bold uppercase">Classification</div>
              <div className={`text-lg font-black uppercase ${theme.alertColor}`}>{alert.alert_type}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-1 font-bold uppercase">Location</div>
              <div className="text-sm font-bold text-slate-200">Floor {alert.floor} • Zone {alert.zone}</div>
              <div className="flex items-center text-[10px] text-slate-500 mt-1">
                <span className="material-symbols-outlined text-[12px] mr-1">location_on</span> {alert.gps.lat}, {alert.gps.lng}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-1 font-bold uppercase">Hardware Triggers</div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {alert.sensor_triggered?.map(s => (
                  <span key={s} className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-[10px] font-bold text-slate-300 uppercase">{s}</span>
                ))}
                {alert.sensor_triggered?.length === 0 && <span className="text-[10px] text-slate-500">None active</span>}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-1 font-bold uppercase">Origin Node</div>
              <div className="text-[10px] font-bold text-violet-400 bg-violet-500/10 p-2 rounded border border-violet-500/20 inline-block">
                {alert.device_id} → YOLOv8 Nano
              </div>
            </div>
            
            <div className="mt-auto pt-4">
              <div className="bg-black aspect-video rounded-lg border border-slate-800 relative flex items-center justify-center overflow-hidden">
                <div className="absolute top-2 left-2 flex items-center space-x-2 text-[10px] text-red-400 bg-black/80 px-2 py-1 rounded border border-red-500/30 z-10 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  <span>REC −30s</span>
                </div>
                {alert.snapshot ? (
                  <img src={alert.snapshot} alt="Anomaly Snapshot" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-4xl text-slate-700 z-10">videocam</span>
                )}
                <span className="absolute bottom-2 right-2 text-[10px] text-white/80 bg-black/60 px-2 py-1 rounded z-10 font-bold">{alert.camera_id}_Buffer</span>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER PANEL - Escalation Matrix */}
        <div className={`md:col-span-6 bg-[#0d1220] border rounded-xl flex flex-col overflow-hidden ${theme.border}/30`}>
          <div className="p-4 border-b border-slate-800/50 flex items-center gap-2 bg-slate-900/50">
            <span className="material-symbols-outlined text-sm text-violet-400 animate-pulse">call_split</span>
            <h2 className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Live Escalation Matrix</h2>
          </div>

          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-6">
            {/* Internal */}
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 mb-3 flex items-center justify-between border-b border-slate-800/50 pb-2 uppercase">
                Internal Responders
                <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">{routing.internal.length} assigned</span>
              </h3>
              <div className="space-y-2">
                {routing.internal.map((contact, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                      <div>
                        <div className="text-sm font-bold text-slate-200 uppercase">{contact.employee.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{contact.employee.role} • Floor {contact.employee.floor} • {contact.reason}</div>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded">
                      {contact.status}
                    </div>
                  </div>
                ))}
                {routing.internal.length === 0 && (
                  <div className="text-[10px] text-slate-500 italic">No internal routing required</div>
                )}
              </div>
            </div>

            {/* External */}
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 mb-3 flex items-center justify-between border-b border-slate-800/50 pb-2 uppercase">
                External Authorities
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sosDispatched ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                  {sosDispatched ? 'SOS Dispatched' : 'Awaiting SOS'}
                </span>
              </h3>
              <div className="space-y-2">
                {routing.external.map((service, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                    <div className="flex items-center gap-3">
                      {sosDispatched ? (
                        <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                      ) : (
                        <span className="material-symbols-outlined text-sm text-slate-600">hourglass_empty</span>
                      )}
                      <div>
                        <div className="text-sm font-bold text-slate-200 uppercase">{service.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Dispatch: {service.number} {service.distance && `• ETA: ${service.distance}`}</div>
                      </div>
                    </div>
                    <div className={`text-[10px] font-bold px-2 py-1 rounded border ${
                      sosDispatched 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}>
                      {sosDispatched ? (routing.gsmUsed ? 'SMS Sent (GSM)' : 'Dispatched') : 'Standby'}
                    </div>
                  </div>
                ))}
                 {routing.external.length === 0 && (
                  <div className="text-[10px] text-slate-500 italic">No external escalation required</div>
                )}
              </div>
            </div>
            
            <div>
              <div className="text-[10px] text-slate-600 italic border-t border-slate-800/50 pt-2">
                * Non-essential personnel and uninvolved floors omitted from notification to prevent panic.
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Actions */}
        <div className={`md:col-span-3 bg-[#0d1220] border rounded-xl flex flex-col overflow-hidden ${theme.border}/30`}>
           <div className="p-4 border-b border-slate-800/50 flex items-center gap-2 bg-slate-900/50">
            <span className="material-symbols-outlined text-sm text-slate-300">touch_app</span>
            <h2 className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Command Actions</h2>
          </div>
           
           <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
             <button onClick={handleCancel} className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 p-4 rounded-lg border border-slate-700 transition-colors">
               <span className="material-symbols-outlined text-sm">cancel</span>
               <span className="text-xs font-bold tracking-wider">Abort False Alarm</span>
             </button>



             
             {!sosDispatched && (
               <div className="mt-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-center">
                 <div className="text-[10px] text-amber-400 font-bold mb-1">External Authority Dispatch</div>
                 <div className="text-xs font-bold text-amber-300 flex items-center justify-center gap-2">
                   <span className="material-symbols-outlined text-sm">touch_app</span>
                   Waiting for employee SOS button press
                 </div>
               </div>
             )}

             {sosDispatched && (
               <div className="mt-4 p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-center">
                 <div className="text-[10px] text-emerald-400 font-bold mb-1">SOS Dispatched</div>
                 <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-2">
                   <span className="material-symbols-outlined text-sm">check_circle</span>
                   External authorities notified
                 </div>
               </div>
             )}
             
             {routing.gsmUsed && (
                <div className="mt-4 p-4 rounded-lg border border-red-500/30 bg-red-600 text-center shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                 <div className="text-xs font-bold text-white flex items-center justify-center gap-2 mb-1">
                   <span className="material-symbols-outlined text-sm animate-pulse">satellite_alt</span>
                   No Internet Connection
                 </div>
                 <div className="text-[10px] text-white/80">GSM Fallback Active</div>
               </div>
             )}

             {/* Speaker Broadcast Status */}
             {state.speakers && state.speakers.length > 0 && (
               <div className="mt-6 pt-4 border-t border-slate-800/50">
                 <h3 className="text-[10px] font-bold text-slate-500 mb-3 flex items-center uppercase">
                   <span className="material-symbols-outlined text-[14px] mr-1 text-violet-400 animate-pulse">podcasts</span> 
                   RPi5 Speaker Nodes
                 </h3>
                 <div className="space-y-2">
                   {state.speakers.filter(s => s.status === 'online').map(s => (
                     <div key={s.id} className="flex items-center justify-between text-[10px] bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg">
                       <div className="flex items-center gap-2">
                         <span className={`material-symbols-outlined text-[12px] ${s.lastAlertMessage ? 'text-violet-400 animate-pulse' : 'text-slate-600'}`}>
                           {s.lastAlertMessage ? 'volume_up' : 'volume_mute'}
                         </span>
                         <span className="font-bold text-slate-300 uppercase">{s.employeeName}</span>
                       </div>
                       <span className={`font-bold ${s.lastAlertMessage ? 'text-violet-400' : 'text-slate-600'}`}>
                         {s.lastAlertMessage ? 'Broadcasting' : 'Standby'}
                       </span>
                     </div>
                   ))}
                 </div>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
