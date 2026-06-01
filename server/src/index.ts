import 'dotenv/config'; // load server/.env into process.env BEFORE app.ts reads it
import { serve } from '@hono/node-server';
import { app, MODEL } from './app';
import { startPoller } from './feed';

const PORT = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[server] bus agent proxy on http://localhost:${info.port} (model ${MODEL})`);
});

// Begin polling the OSU feed in the background (best-effort; falls back to fixtures on failure).
startPoller().catch((err) => console.error('[feed] poller failed to start:', err));
