import Subscription from '../models/subscription.model.js';
import { daysUntil, nextRenewalDate } from './renewal.js';

// A reminder is sent this many days before a subscription renews
const REMINDER_DAYS = [7, 5, 2, 1];

// Returns one reminder for every active subscription that renews in 7, 5, 2 or 1 days.
// Paused and cancelled subscriptions are skipped because only active ones are loaded.
export const findRemindersDueToday = async () => {
    // populate swaps the stored user id for that user's name and email
    const subscriptions = await Subscription.find({ status: 'active' }).populate('user', 'name email');

    const reminders = [];

    for (const subscription of subscriptions) {
        const daysLeft = daysUntil(subscription.renewalDate);

        // subscription.user is empty when the account no longer exists
        if (REMINDER_DAYS.includes(daysLeft) && subscription.user) {
            reminders.push({
                subscriptionId: subscription._id.toString(),
                subscriptionName: subscription.name,
                userName: subscription.user.name,
                email: subscription.user.email,
                price: subscription.price,
                currency: subscription.currency,
                frequency: subscription.frequency,
                renewalDate: subscription.renewalDate,
                isTrial: subscription.isTrial,
                daysLeft,
            });
        }
    }

    return reminders;
};

// Moves the renewal date to the next period for every active subscription that renews today
// or whose renewal date has already passed. Returns how many were moved.
export const rollForwardRenewals = async () => {
    const subscriptions = await Subscription.find({ status: 'active' });

    let moved = 0;

    for (const subscription of subscriptions) {
        if (daysUntil(subscription.renewalDate) <= 0) {
            subscription.renewalDate = nextRenewalDate(subscription.renewalDate, subscription.frequency);

            // Once a free trial's end date has passed it is a normal paid subscription
            subscription.isTrial = false;

            await subscription.save();

            moved += 1;
        }
    }

    return moved;
};
