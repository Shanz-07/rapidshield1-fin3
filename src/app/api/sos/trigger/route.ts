import { NextRequest, NextResponse } from 'next/server';
import { serverState, broadcastState, SOSDispatch } from '@/lib/store';

/**
 * POST /api/sos/trigger
 * 
 * Called by the RPi5 when an employee presses the SOS button on their
 * wireless ESP32 speaker device. The RPi5 has already dispatched
 * SMS to external authorities via GSM — this endpoint updates the
 * dashboard so it stays in sync.
 * 
 * Payload from RPi5:
 * {
 *   alert_type: string,
 *   floor: number,
 *   zone: string,
 *   timestamp: string,
 *   device_id: string,        // RPi5 device ID
 *   triggered_by: string,     // ESP32 speaker device ID e.g. "SPK_EMP_01"
 *   contacts_notified: string[] // e.g. ["Fire Department", "Police"]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    const {
      alert_type,
      floor,
      zone,
      timestamp,
      device_id,
      triggered_by,
      contacts_notified = [],
    } = payload;

    // Find the speaker device that triggered SOS
    const speaker = serverState.speakers.find(
      s => s.id === triggered_by || s.rpiChannel === triggered_by
    );

    // Build the SOS dispatch record for the dashboard
    const dispatch: SOSDispatch = {
      id: `SOS_${Date.now()}`,
      triggeredBy: speaker?.assignedTo || triggered_by,
      employeeName: speaker?.employeeName || triggered_by,
      employeeRole: speaker?.role || 'Security',
      floor: floor || speaker?.floor || 1,
      timestamp: timestamp || new Date().toISOString(),
      alertType: alert_type || serverState.activeAlert?.alert_type || null,
      servicesDispatched: contacts_notified.map((name: string) => ({
        name,
        number: 'GSM',
        distance: undefined,
      })),
      status: 'dispatched',
      venueGps: serverState.config.gps,
      dispatchedVia: 'RPi5_GSM',
    };

    // Add to dispatch log
    serverState.sosDispatches.unshift(dispatch);

    // Mark the speaker as SOS pressed
    if (speaker) {
      serverState.speakers = serverState.speakers.map(s =>
        s.id === speaker.id ? { ...s, sosPressed: true } : s
      );
    }

    // Push update to all connected dashboard clients via SSE
    broadcastState();

    return NextResponse.json({
      success: true,
      message: 'SOS recorded on dashboard',
      dispatch_id: dispatch.id,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
