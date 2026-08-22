import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';

import Subscription from '../models/subscription.model.js';
import User from '../models/user.model.js';
import { findRemindersDueToday, rollForwardRenewals } from '../utils/daily-check.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// A date this many days after (or, with a negative number, before) right now
const daysFromNow = (days) => new Date(Date.now() + days * MS_PER_DAY);

const createUser = () => {
    return User.create({ name: 'Test User', email: 'test@example.com', password: 'hashed-password' });
};

// Creates a subscription that renews in the given number of days
const createSubscription = (user, renewsInDays, extra = {}) => {
    return Subscription.create({
        user: user._id,
        name: 'Netflix',
        price: 15.99,
        frequency: 'monthly',
        startDate: daysFromNow(-60),
        renewalDate: daysFromNow(renewsInDays),
        ...extra,
    });
};

describe('findRemindersDueToday', () => {
    it('finds subscriptions that renew in 7, 5, 2 or 1 days', async () => {
        const user = await createUser();
        await createSubscription(user, 7);
        await createSubscription(user, 5);
        await createSubscription(user, 2);
        await createSubscription(user, 1);

        const reminders = await findRemindersDueToday();

        expect(reminders.map((reminder) => reminder.daysLeft).sort()).toEqual([1, 2, 5, 7]);
    });

    it('ignores subscriptions that renew on any other day', async () => {
        const user = await createUser();
        await createSubscription(user, 0);
        await createSubscription(user, 3);
        await createSubscription(user, 6);
        await createSubscription(user, 8);
        await createSubscription(user, 30);

        const reminders = await findRemindersDueToday();

        expect(reminders).toEqual([]);
    });

    it('ignores paused and cancelled subscriptions', async () => {
        const user = await createUser();
        await createSubscription(user, 5, { status: 'paused' });
        await createSubscription(user, 5, { status: 'cancelled' });

        const reminders = await findRemindersDueToday();

        expect(reminders).toEqual([]);
    });

    it('includes everything the email needs', async () => {
        const user = await createUser();
        const subscription = await createSubscription(user, 5, { currency: 'EUR' });

        const [reminder] = await findRemindersDueToday();

        expect(reminder).toEqual({
            subscriptionId: subscription._id.toString(),
            subscriptionName: 'Netflix',
            userName: 'Test User',
            email: 'test@example.com',
            price: 15.99,
            currency: 'EUR',
            frequency: 'monthly',
            renewalDate: subscription.renewalDate,
            isTrial: false,
            daysLeft: 5,
        });
    });

    it('marks a free trial that is about to end', async () => {
        const user = await createUser();
        await createSubscription(user, 2, { isTrial: true });

        const [reminder] = await findRemindersDueToday();

        expect(reminder.isTrial).toBe(true);
    });

    it('skips a subscription whose user no longer exists', async () => {
        const deletedUser = { _id: new mongoose.Types.ObjectId() };
        await createSubscription(deletedUser, 5);

        const reminders = await findRemindersDueToday();

        expect(reminders).toEqual([]);
    });
});

describe('rollForwardRenewals', () => {
    it('moves a subscription that renews today to its next period', async () => {
        const user = await createUser();
        const subscription = await createSubscription(user, 0);

        const moved = await rollForwardRenewals();
        const updated = await Subscription.findById(subscription._id);

        expect(moved).toBe(1);
        expect(updated.renewalDate > new Date()).toBe(true);
        // Monthly, so the day of the month stays the same unless the next month is shorter
        expect(updated.renewalDate.getUTCMonth()).not.toBe(subscription.renewalDate.getUTCMonth());
    });

    it('moves a date that passed long ago into the future', async () => {
        const user = await createUser();
        const subscription = await createSubscription(user, -45);

        await rollForwardRenewals();
        const updated = await Subscription.findById(subscription._id);

        expect(updated.renewalDate > new Date()).toBe(true);
    });

    it('turns a finished free trial into a normal subscription', async () => {
        const user = await createUser();
        const subscription = await createSubscription(user, 0, { isTrial: true });

        await rollForwardRenewals();
        const updated = await Subscription.findById(subscription._id);

        expect(updated.isTrial).toBe(false);
    });

    it('leaves subscriptions that renew in the future alone', async () => {
        const user = await createUser();
        const subscription = await createSubscription(user, 3, { isTrial: true });

        const moved = await rollForwardRenewals();
        const updated = await Subscription.findById(subscription._id);

        expect(moved).toBe(0);
        expect(updated.renewalDate).toEqual(subscription.renewalDate);
        expect(updated.isTrial).toBe(true);
    });

    it('leaves paused and cancelled subscriptions alone', async () => {
        const user = await createUser();
        const paused = await createSubscription(user, -3, { status: 'paused' });
        const cancelled = await createSubscription(user, -3, { status: 'cancelled' });

        const moved = await rollForwardRenewals();

        expect(moved).toBe(0);
        expect((await Subscription.findById(paused._id)).renewalDate).toEqual(paused.renewalDate);
        expect((await Subscription.findById(cancelled._id)).renewalDate).toEqual(cancelled.renewalDate);
    });
});
