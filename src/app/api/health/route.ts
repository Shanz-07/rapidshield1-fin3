import { NextRequest, NextResponse } from 'next/server';
import { serverState, broadcastState } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health — simple heartbeat check (used by RPi5 to confirm dashboard is reachable)
 */
export async function GET() {
  serverState.rpi5LastHeartbeat = Date.now();
  broadcastState();
  return NextResponse.json({ status: 'ok', uptime: process.uptime() });
}

/**
 * POST /api/health — RPi5 sends real system stats periodically
 * 
 * Response includes alert_active so RPi5 can detect when the dashboard
 * operator has aborted an alert (clears RPi5 alert state + stops ESP32 buzzers).
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    serverState.rpi5LastHeartbeat = Date.now();

    serverState.rpi5Stats = {
      cpuPercent: data.cpu_percent ?? serverState.rpi5Stats.cpuPercent,
      memUsedMB: data.mem_used_mb ?? serverState.rpi5Stats.memUsedMB,
      memTotalMB: data.mem_total_mb ?? serverState.rpi5Stats.memTotalMB,
      tempC: data.temp_c ?? serverState.rpi5Stats.tempC,
      uptimeSeconds: data.uptime_seconds ?? serverState.rpi5Stats.uptimeSeconds,
      ip: data.ip ?? serverState.rpi5Stats.ip,
      connectedDevices: data.connected_devices ?? serverState.rpi5Stats.connectedDevices,
    };

    broadcastState();

    return NextResponse.json({
      status: 'ok',
      alert_active: serverState.activeAlert !== null,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

