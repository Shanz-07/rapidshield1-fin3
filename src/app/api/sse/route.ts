import { NextRequest } from 'next/server';
import { sseClients, serverState } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  let responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const clientId = Date.now().toString();

  const client = {
    id: clientId,
    send: (data: string) => {
      writer.write(encoder.encode(`data: ${data}\n\n`));
    }
  };

  sseClients.push(client);

  // Send initial state
  client.send(JSON.stringify({ type: 'STATE_UPDATE', state: serverState }));

  req.signal.addEventListener('abort', () => {
    const index = sseClients.findIndex(c => c.id === clientId);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
    writer.close();
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
