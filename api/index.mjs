import { handle } from 'hono/vercel';
import app from '../apps/remix/build/server/hono/server/router.js';

export default handle(app);
