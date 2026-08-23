// Runs the daily check right now. Use it with: npm run daily-check
// The API must already be running in another terminal (npm run dev).

import { runDailyCheckNow } from '../config/upstash.js';

const workflowRunId = await runDailyCheckNow();

console.log(`Daily check started (${workflowRunId}). Look at the "npm run dev" window to see what it did.`);

process.exit(0);
