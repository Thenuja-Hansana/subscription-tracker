import Subscription from '../models/subscription.model.js';

// Every query below includes the signed-in user's id, so a user can only
// ever see or change their own subscriptions.

export const createSubscription = async (req, res) => {
    const { name, price, currency, frequency, category, paymentMethod, startDate, renewalDate, isTrial } = req.body;

    if (isTrial && !renewalDate) {
        return res.status(400).json({ success: false, error: 'For a free trial, set renewalDate to the day the trial ends' });
    }

    const subscription = await Subscription.create({
        name,
        price,
        currency,
        frequency,
        category,
        paymentMethod,
        startDate,
        renewalDate,
        isTrial,
        user: req.user._id,
    });

    res.status(201).json({ success: true, data: subscription });
};

export const getSubscriptions = async (req, res) => {
    const filter = { user: req.user._id };

    // Optional filters, e.g. /subscriptions?status=active&category=entertainment
    if (req.query.status) {
        filter.status = req.query.status;
    }

    if (req.query.category) {
        filter.category = req.query.category;
    }

    // Soonest renewal first
    const subscriptions = await Subscription.find(filter).sort({ renewalDate: 1 });

    res.json({ success: true, data: subscriptions });
};

export const getSubscription = async (req, res) => {
    const subscription = await Subscription.findOne({ _id: req.params.id, user: req.user._id });

    if (!subscription) {
        return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    res.json({ success: true, data: subscription });
};

export const updateSubscription = async (req, res) => {
    const subscription = await Subscription.findOne({ _id: req.params.id, user: req.user._id });

    if (!subscription) {
        return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    // Only these fields can be changed. Anything else in the request is ignored.
    // Pausing or cancelling is done by changing the status.
    const allowedFields = [
        'name',
        'price',
        'currency',
        'frequency',
        'category',
        'paymentMethod',
        'status',
        'startDate',
        'renewalDate',
        'isTrial',
    ];

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            subscription[field] = req.body[field];
        }
    }

    await subscription.save();

    res.json({ success: true, data: subscription });
};

export const deleteSubscription = async (req, res) => {
    const subscription = await Subscription.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!subscription) {
        return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    res.json({ success: true, message: 'Subscription deleted' });
};

// How many times a year each frequency is paid
const PAYMENTS_PER_YEAR = { daily: 365, weekly: 52, monthly: 12, yearly: 1 };

// Money has two decimal places, so 21.666666 becomes 21.67
const roundMoney = (amount) => Math.round(amount * 100) / 100;

export const getSummary = async (req, res) => {
    // Paused and cancelled subscriptions cost nothing, so only look at active ones
    const subscriptions = await Subscription.find({ user: req.user._id, status: 'active' });

    // One entry per currency, because amounts in different currencies cannot be added together.
    // Example: { USD: { monthly: 20, yearly: 240, byCategory: { entertainment: { monthly: 10, yearly: 120 } } } }
    const totals = {};

    // Free trials cost nothing yet, so they are listed on their own
    const trials = [];

    for (const subscription of subscriptions) {
        const { name, price, currency, frequency, category } = subscription;

        if (subscription.isTrial) {
            trials.push({ name, price, currency, frequency, trialEndsOn: subscription.renewalDate });
            continue;
        }

        const yearly = price * PAYMENTS_PER_YEAR[frequency];
        const monthly = yearly / 12;

        // The first time we see a currency or a category, start it at zero
        if (!totals[currency]) {
            totals[currency] = { monthly: 0, yearly: 0, byCategory: {} };
        }

        if (!totals[currency].byCategory[category]) {
            totals[currency].byCategory[category] = { monthly: 0, yearly: 0 };
        }

        const currencyTotal = totals[currency];
        const categoryTotal = currencyTotal.byCategory[category];

        currencyTotal.monthly = roundMoney(currencyTotal.monthly + monthly);
        currencyTotal.yearly = roundMoney(currencyTotal.yearly + yearly);
        categoryTotal.monthly = roundMoney(categoryTotal.monthly + monthly);
        categoryTotal.yearly = roundMoney(categoryTotal.yearly + yearly);
    }

    res.json({ success: true, data: { totals, trials } });
};
