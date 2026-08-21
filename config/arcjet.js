import arcjet, { detectBot, tokenBucket, validateEmail } from '@arcjet/node';

import { ARCJET_KEY, NODE_ENV } from './env.js';

if (!ARCJET_KEY) {
    console.warn(`ARCJET_KEY is missing from .env.${NODE_ENV}.local, so the API is running without Arcjet protection`);
}

// LIVE blocks requests. DRY_RUN only records what it would have blocked.
// Tools like Postman and Thunder Client count as bots, so bots are only blocked in production.
const botMode = NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN';

// One Arcjet client for the whole app. The rules are added below.
const client = arcjet({ key: ARCJET_KEY, rules: [] });

// Checked on every request
export const apiProtection = client
    // Blocks automated clients. Add a name to "allow" to let one through (list: https://arcjet.com/bot-list)
    .withRule(detectBot({ mode: botMode, allow: ['CATEGORY:SEARCH_ENGINE'] }))
    // Rate limit: each IP address has a bucket of 20 requests that gets 10 back every 10 seconds
    .withRule(tokenBucket({ mode: 'LIVE', capacity: 20, refillRate: 10, interval: 10 }));

// Checked only on sign up: rejects throwaway, badly formed and undeliverable email addresses
export const emailProtection = client.withRule(
    validateEmail({ mode: 'LIVE', deny: ['DISPOSABLE', 'INVALID', 'NO_MX_RECORDS'] }),
);
