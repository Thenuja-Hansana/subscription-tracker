import { describe, expect, it, vi } from 'vitest';

import transporter from '../config/nodemailer.js';
import { buildReminderEmail } from '../utils/email-template.js';
import { sendReminderEmail } from '../utils/send-email.js';

// Replace the real email sender with a stand-in, so tests never send an email
vi.mock('../config/nodemailer.js', () => {
    return { default: { sendMail: vi.fn() } };
});

const reminder = {
    subscriptionId: '507f1f77bcf86cd799439011',
    subscriptionName: 'Netflix',
    userName: 'Test User',
    email: 'test@example.com',
    price: 15.9,
    currency: 'USD',
    frequency: 'monthly',
    renewalDate: new Date('2026-10-09T00:00:00.000Z'),
    isTrial: false,
    daysLeft: 5,
};

describe('buildReminderEmail', () => {
    it('says when the subscription renews and what it costs', () => {
        const { subject, text } = buildReminderEmail(reminder);

        expect(subject).toBe('Netflix renews in 5 days');
        expect(text).toContain('Hi Test User,');
        expect(text).toContain('Your Netflix subscription renews in 5 days, on 9 October 2026.');
        expect(text).toContain('You will be charged USD 15.90 (monthly).');
    });

    it('says "tomorrow" when there is one day left', () => {
        const { subject } = buildReminderEmail({ ...reminder, daysLeft: 1 });

        expect(subject).toBe('Netflix renews tomorrow');
    });

    it('uses different wording for a free trial', () => {
        const { subject, text } = buildReminderEmail({ ...reminder, isTrial: true, daysLeft: 2 });

        expect(subject).toBe('Your Netflix free trial ends in 2 days');
        expect(text).toContain('Your free trial of Netflix ends in 2 days, on 9 October 2026.');
        expect(text).toContain('After that you will be charged USD 15.90 (monthly).');
    });

    it('works when the date arrives as text', () => {
        // Upstash passes data between steps as JSON, which turns dates into text
        const { text } = buildReminderEmail({ ...reminder, renewalDate: '2026-10-09T00:00:00.000Z' });

        expect(text).toContain('on 9 October 2026.');
    });
});

describe('sendReminderEmail', () => {
    it('sends the reminder to the owner of the subscription', async () => {
        await sendReminderEmail(reminder);

        expect(transporter.sendMail).toHaveBeenCalledTimes(1);
        expect(transporter.sendMail).toHaveBeenCalledWith({
            from: 'Subscription Tracker <sender@example.com>',
            to: 'test@example.com',
            subject: 'Netflix renews in 5 days',
            text: expect.stringContaining('Your Netflix subscription renews in 5 days'),
        });
    });
});
