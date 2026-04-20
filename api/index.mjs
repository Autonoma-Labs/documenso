import { handle } from '@hono/node-server/vercel';

const { default: app } = await import('../apps/remix/build/server/hono/server/router.js');

export default handle(app);
