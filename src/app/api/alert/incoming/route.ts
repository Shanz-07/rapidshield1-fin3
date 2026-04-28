import { NextRequest, NextResponse } from 'next/server';
import { processIncomingAlert } from '@/lib/routingBrain';
import { ActiveAlertPayload } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const payload: ActiveAlertPayload = await req.json();
    
    // Validate payload minimally
    if (!payload.alert_type || !payload.camera_id || payload.floor === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    processIncomingAlert(payload);

    return NextResponse.json({ success: true, message: 'Alert processed and routed successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
}
