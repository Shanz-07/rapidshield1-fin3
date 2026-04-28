import { NextRequest, NextResponse } from 'next/server';
import { triggerSOS } from '@/lib/routingBrain';

export async function POST(req: NextRequest) {
  try {
    const { employeeId } = await req.json();
    
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
    }

    const dispatch = triggerSOS(employeeId);
    
    if (!dispatch) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'SOS dispatched via RPi5 server',
      dispatch 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
