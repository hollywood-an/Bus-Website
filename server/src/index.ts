import 'dotenv/config'; // load server/.env into process.env BEFORE app.ts reads it
import { serve } from '@hono/node-server';
import { app, MODEL } from './app';
import { startPoller, getRoutes } from './feed';
import { getReportStore } from './store';

const PORT = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[server] bus agent proxy on http://localhost:${info.port} (model ${MODEL})`);
});

// Begin polling the OSU feed in the background (best-effort; falls back to fixtures on failure),
// then seed the report store with demo data so the crowdsourced layer looks alive for reviewers.
startPoller()
  .then(() => {
    if ((process.env.SEED_DEMO ?? 'true').toLowerCase() !== 'false') {
      getReportStore().seed(getRoutes().map((r) => r.code));
      console.log('[reports] seed/demo data ensured');
    }
  })
  .catch((err) => console.error('[feed] poller failed to start:', err));

// Periodically purge decayed reports.
setInterval(() => getReportStore().sweep(), 10 * 60_000);
