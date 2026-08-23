import { Client as QStashClient } from '@upstash/qstash';
import { Client as WorkflowClient } from '@upstash/workflow';

import { QSTASH_TOKEN, SERVER_URL } from './env.js';

// The address Upstash calls to run the daily check
const DAILY_CHECK_URL = `${SERVER_URL}/api/v1/workflows/daily-check`;

// On your own computer (QSTASH_DEV=true) these connect to a local Upstash server that the
// library downloads and starts by itself, so no token is needed. When hosted they use QSTASH_TOKEN.
const qstashClient = new QStashClient({ token: QSTASH_TOKEN });
const workflowClient = new WorkflowClient({ token: QSTASH_TOKEN });

// Asks Upstash to run the daily check every day at 09:00 UTC ("0 9 * * *" is cron for that).
// Using the same scheduleId every time replaces the schedule instead of adding a second one.
export const scheduleDailyCheck = async () => {
    await qstashClient.schedules.create({
        scheduleId: 'daily-check',
        destination: DAILY_CHECK_URL,
        cron: '0 9 * * *',
    });
};

// Runs the daily check right now instead of waiting for 09:00
export const runDailyCheckNow = async () => {
    const { workflowRunId } = await workflowClient.trigger({ url: DAILY_CHECK_URL });

    return workflowRunId;
};
