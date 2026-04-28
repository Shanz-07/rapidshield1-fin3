import { NextResponse } from 'next/server';
import { serverState } from '@/lib/store';

export async function GET() {
  return NextResponse.json({
    config: serverState.config,
    employees: serverState.employees,
    cameras: serverState.cameras,
    sensors: serverState.sensors
  });
}
