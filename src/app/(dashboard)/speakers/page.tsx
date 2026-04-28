'use client';

import { useApp } from '@/contexts/AppContext';

export default function SpeakersPage() {
  const { state, updateState } = useApp();
  const speakers = state.speakers || [];
  const sosDispatches = state.sosDispatches || [];
  const activeAlert = state.activeAlert;

  const onlineCount = speakers.filter(s => s.status === 'online').length;
  const offlineCount = speakers.filter(s => s.status === 'offline').length;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Medical': return 'medical_services';
      case 'Security': return 'local_police';
      case 'Office': return 'engineering';
      default: return 'speaker';
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <p className="text-primary text-label-caps uppercase mb-1">Hardware Network / ESP32</p>
          <h1 className="text-headline-lg text-on-surface">Employee Speaker Devices</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-bold text-on-surface-variant">{onlineCount} Online</span>
          </div>
          <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-xs font-bold text-on-surface-variant">{offlineCount} Offline</span>
          </div>
        </div>
      </div>

      {/* Active Alert Banner */}
      {activeAlert && (
        <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/30 flex items-center gap-4 animate-pulse">
          <span className="material-symbols-outlined text-error text-2xl">campaign</span>
          <div className="flex-1">
            <div className="text-sm font-bold text-error uppercase">{activeAlert.alert_type} — Floor {activeAlert.floor}, Zone {activeAlert.zone}</div>
            <div className="text-[10px] text-on-surface-variant mt-0.5">All online devices are broadcasting this alert. SOS buttons on devices are ARMED.</div>
          </div>
          <span className="text-[10px] font-bold text-error bg-error/10 border border-error/20 px-3 py-1 rounded-lg">LIVE</span>
        </div>
      )}

      {/* Speaker Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {speakers.map(speaker => {
          const isAlertActive = !!speaker.lastAlertMessage && !!activeAlert;
          const icon = getRoleIcon(speaker.role);
          const borderColor = speaker.role === 'Medical' ? 'border-l-secondary dark:border-l-tertiary' : speaker.role === 'Security' ? 'border-l-primary' : 'border-l-outline';

          return (
            <div key={speaker.id} className={`glass-panel rounded-xl overflow-hidden flex flex-col transition-all border-l-4 ${borderColor} ${
              speaker.sosPressed ? 'shadow-[0_0_20px_rgba(186,26,26,0.4)]' : isAlertActive ? 'shadow-[0_0_15px_rgba(var(--color-primary),0.2)]' : ''
            }`}>
              {/* Header */}
              <div className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">{icon}</span>
                  <div>
                    <div className="text-sm font-bold text-on-surface uppercase">{speaker.employeeName}</div>
                    <div className="text-[10px] text-on-surface-variant">Floor {speaker.floor} · {speaker.id}</div>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                  speaker.status === 'online' 
                    ? 'bg-primary/10 text-primary border-primary/20' 
                    : 'bg-surface-container-highest text-on-surface-variant border-outline-variant/20'
                }`}>
                  {speaker.status === 'online' ? 'Connected' : 'Offline'}
                </div>
              </div>

              {/* Device Info */}
              <div className="px-4 pb-2">
                <div className="flex items-center gap-2 text-[10px] text-on-surface-variant bg-surface-container dark:bg-surface-container-high p-2 rounded-lg">
                  <span className="material-symbols-outlined text-[14px]">wifi</span>
                  <span className="font-mono">{speaker.rpiChannel}</span>
                </div>
              </div>

              {/* Alert Status */}
              <div className="px-4 pb-4 flex-1 flex flex-col justify-end">
                {isAlertActive && speaker.status === 'online' ? (
                  <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg">
                    <div className="text-[10px] text-primary font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm animate-pulse">campaign</span> Broadcasting
                    </div>
                    <div className="text-xs text-on-surface leading-tight">{speaker.lastAlertMessage}</div>
                  </div>
                ) : speaker.sosPressed ? (
                  <div className="bg-error/10 border border-error/20 p-3 rounded-lg">
                    <div className="text-[10px] text-error font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">sos</span> SOS PRESSED — Authorities Dispatched
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-container dark:bg-surface-container-high p-3 rounded-lg text-center">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase">Standby</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* SOS Dispatch Log — shows when hardware SOS was pressed */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/20 dark:border-outline-variant/20 flex justify-between items-center bg-surface-container-low/50 dark:bg-surface-container-lowest/50">
          <h3 className="text-label-caps text-on-surface uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-sm">emergency</span>
            SOS Dispatch History
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-on-surface-variant font-bold">{sosDispatches.length} Records</span>
            {sosDispatches.length > 0 && (
              <button
                onClick={() => updateState('CLEAR_SOS', {})}
                className="text-[10px] font-bold text-error bg-error/10 border border-error/20 px-2.5 py-1 rounded-lg hover:bg-error/20 transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">delete_sweep</span>
                Clear All
              </button>
            )}
          </div>
        </div>
        {sosDispatches.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-sm">No SOS events — SOS can only be triggered from the physical device button</div>
        ) : (
          <div className="divide-y divide-outline-variant/10 dark:divide-outline-variant/20 max-h-[400px] overflow-y-auto custom-scrollbar">
            {sosDispatches.map(dispatch => (
              <div key={dispatch.id} className="p-4 hover:bg-surface-container/50 dark:hover:bg-surface-container-high/50 transition-colors flex justify-between items-start">
                <div className="flex gap-4">
                  <div className={`mt-1 p-2 rounded-lg ${
                    dispatch.status === 'dispatching' ? 'bg-secondary/10 dark:bg-tertiary/10 text-secondary dark:text-tertiary' : 
                    'bg-primary/10 text-primary'
                  }`}>
                    <span className="material-symbols-outlined text-sm">phone_in_talk</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-on-surface">{dispatch.employeeName} pressed SOS</div>
                    <div className="text-[10px] text-on-surface-variant mt-1 mb-2">Floor {dispatch.floor} · {dispatch.alertType ? `During: ${dispatch.alertType}` : 'Manual'} · via {dispatch.dispatchedVia}</div>
                    <div className="flex flex-wrap gap-2">
                      {dispatch.servicesDispatched.map((svc, i) => (
                        <div key={i} className="text-[10px] font-bold bg-error/10 text-error border border-error/20 px-2 py-1 rounded">
                          {svc.name} ({svc.number})
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className={`text-[10px] font-bold px-2 py-1 rounded inline-block ${
                    dispatch.status === 'dispatching' ? 'bg-secondary/10 dark:bg-tertiary/10 text-secondary dark:text-tertiary border border-secondary/20 dark:border-tertiary/20 animate-pulse' : 
                    'bg-primary/10 text-primary border border-primary/20'
                  }`}>
                    {dispatch.status === 'dispatching' ? 'Dispatching...' : 'Dispatched'}
                  </div>
                  <div className="text-[10px] text-on-surface-variant">{new Date(dispatch.timestamp).toLocaleTimeString()}</div>
                  <button
                    onClick={() => updateState('DELETE_SOS_DISPATCH', { dispatchId: dispatch.id })}
                    className="mt-1 text-on-surface-variant hover:text-error transition-colors p-1 rounded hover:bg-error/10"
                    title="Delete this dispatch record"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
