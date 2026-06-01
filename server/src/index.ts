import { serve } from '@hono/node-server';
import { app, MODEL } from './app';

const PORT = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[server] bus agent proxy on http://localhost:${info.port} (model ${MODEL})`);
});
