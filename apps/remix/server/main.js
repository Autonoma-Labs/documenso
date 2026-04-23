/**
 * This is the main entry point for the server which will launch the RR7 application
 * and spin up auth, api, etc.
 *
 * Note:
 *  This file will be copied to the build folder during build time.
 *  Running this file will not work without a build.
 */
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import handle from 'hono-react-router-adapter/node';

import server from './hono/server/router.js';
import * as build from './index.js';

// Resolve the client build directory relative to this file rather than
// process.cwd(), so the server works regardless of the working directory it is
// launched from (e.g. Render's start command runs from the repo root).
const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'client');
const assetsPrefix = join(clientRoot, 'assets');

server.use(
  serveStatic({
    root: clientRoot,
    onFound: (path, c) => {
      if (path.startsWith(assetsPrefix)) {
        // Hard cache assets with hashed file names.
        c.header('Cache-Control', 'public, immutable, max-age=31536000');
      } else {
        // Cache with revalidation for rest of static files.
        c.header('Cache-Control', 'public, max-age=0, stale-while-revalidate=86400');
      }
    },
  }),
);

const handler = handle(build, server);

const port = parseInt(process.env.PORT || '3000', 10);

serve({ fetch: handler.fetch, port });
