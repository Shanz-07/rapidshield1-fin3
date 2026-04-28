import { NextRequest, NextResponse } from 'next/server';

// In-memory station config (synced from dashboard setup page)
const globalForStations = global as unknown as { stationConfig: any[] | null };
if (!globalForStations.stationConfig) {
  globalForStations.stationConfig = null;
}

export async function GET() {
  // Return saved station config (phone numbers for SMS dispatch)
  return NextResponse.json({
    stations: globalForStations.stationConfig || [],
  });
}

export async function POST(req: NextRequest) {
  try {
    const { stations } = await req.json();

    if (!Array.isArray(stations)) {
      return NextResponse.json({ error: 'Invalid stations data' }, { status: 400 });
    }

    globalForStations.stationConfig = stations;

    return NextResponse.json({ success: true, count: stations.length });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
