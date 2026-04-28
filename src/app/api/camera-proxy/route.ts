import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'RapidShield-Dashboard/1.0',
      },
    });

    if (!response.ok || !response.body) {
      return new Response('Failed to connect to camera stream', { status: 502 });
    }

    // Pipe the MJPEG stream through to the browser
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-cache, no-store',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return new Response('Camera unreachable', { status: 502 });
  }
}
