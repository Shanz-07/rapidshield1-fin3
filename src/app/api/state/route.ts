import { NextRequest, NextResponse } from 'next/server';
import { serverState, broadcastState, syncSpeakersWithEmployees } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/state — Returns the full server state for polling clients
 */
export async function GET() {
  return NextResponse.json(serverState);
}

// RPi5 edge device — send CLEAR command when dashboard aborts an alert
// Change this to the RPi5's IP reachable from the dashboard network
const RPI5_CLEAR_URL = 'http://192.168.4.1:8080/clear';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    
    if (update.type === 'UPDATE_EMPLOYEES') {
      serverState.employees = update.employees;
      // Auto-sync speakers when employees change
      syncSpeakersWithEmployees();
    } else if (update.type === 'UPDATE_CONFIG') {
      serverState.config = update.config;
    } else if (update.type === 'UPDATE_CAMERAS') {
      serverState.cameras = update.cameras;
    } else if (update.type === 'UPDATE_SENSORS') {
      serverState.sensors = update.sensors;
    } else if (update.type === 'UPDATE_SPEAKERS') {
      serverState.speakers = update.speakers;
    } else if (update.type === 'CLEAR_ACTIVE_ALERT') {
      serverState.activeAlert = null;
    } else if (update.type === 'CANCEL_ALERT') {
      serverState.activeAlert = null;
      if (serverState.logs.length > 0) {
        serverState.logs[0].resolution = 'False Alarm / Cancelled';
      }
      // Reset speaker alert states
      serverState.speakers = serverState.speakers.map(s => ({
        ...s,
        lastAlertPlayed: null,
        lastAlertMessage: null,
        sosPressed: false,
      }));

      // Best-effort: Tell RPi5 to broadcast CLEAR to all ESP32 buzzers
      fetch(RPI5_CLEAR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'dashboard', reason: 'operator_abort' }),
        signal: AbortSignal.timeout(3000),
      }).catch(() => {
        // RPi5 unreachable — CLEAR will not be sent to ESP32 devices
      });
    } else if (update.type === 'CLEAR_SOS') {
      serverState.sosDispatches = [];
      serverState.speakers = serverState.speakers.map(s => ({ ...s, sosPressed: false }));
    } else if (update.type === 'DELETE_LOG') {
      serverState.logs = serverState.logs.filter(log => log.id !== update.logId);
    } else if (update.type === 'DELETE_SOS_DISPATCH') {
      serverState.sosDispatches = serverState.sosDispatches.filter(d => d.id !== update.dispatchId);
    } else if (update.type === 'CLEAR_LOGS') {
      serverState.logs = [];
    }

    broadcastState();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

