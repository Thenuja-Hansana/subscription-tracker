import mongoose from 'mongoose';

import { nextRenewalDate } from '../utils/renewal.js';

// The only values these fields accept. To support another one, add it to its list.
const CURRENCIES = ['USD', 'EUR', 'GBP'];
const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];
const CATEGORIES = ['entertainment', 'productivity', 'utilities', 'education', 'health', 'finance', 'other'];
const STATUSES = ['active', 'paused', 'cancelled'];

const subscriptionSchema = new mongoose.Schema(
    {
        // The user who owns this subscription
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minLength: [2, 'Name must be at least 2 characters'],
            maxLength: [100, 'Name must be at most 100 characters'],
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative'],
            cast: 'Price must be a number',
        },
        // A field with a default is filled in when it is left out.
        // "required" on top of that stops someone from saving it as empty (null).
        currency: {
            type: String,
            required: [true, 'Currency is required'],
            enum: { values: CURRENCIES, message: `Currency must be one of: ${CURRENCIES.join(', ')}` },
            default: 'USD',
        },
        // How often the subscription is paid
        frequency: {
            type: String,
            required: [true, 'Frequency is required'],
            enum: { values: FREQUENCIES, message: `Frequency must be one of: ${FREQUENCIES.join(', ')}` },
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            enum: { values: CATEGORIES, message: `Category must be one of: ${CATEGORIES.join(', ')}` },
            default: 'other',
        },
        paymentMethod: {
            type: String,
            trim: true,
        },
        // Only active subscriptions get reminders and count towards spending
        status: {
            type: String,
            required: [true, 'Status is required'],
            enum: { values: STATUSES, message: `Status must be one of: ${STATUSES.join(', ')}` },
            default: 'active',
        },
        startDate: {
            type: Date,
            required: [true, 'Start date is required'],
            default: Date.now,
            cast: 'Start date must be a valid date',
        },
        // The next day money will be taken. For a free trial this is the day the trial ends.
        renewalDate: {
            type: Date,
            cast: 'Renewal date must be a valid date',
        },
        isTrial: {
            type: Boolean,
            required: [true, 'isTrial is required'],
            default: false,
        },
    },
    // Adds createdAt and updatedAt to every subscription
    { timestamps: true },
);

// Runs every time a subscription is checked before saving
subscriptionSchema.pre('validate', function () {
    // If no renewal date was given, work it out from the start date and frequency
    if (!this.renewalDate && this.startDate && FREQUENCIES.includes(this.frequency)) {
        this.renewalDate = nextRenewalDate(this.startDate, this.frequency);
    }

    if (this.renewalDate && this.startDate && this.renewalDate <= this.startDate) {
        this.invalidate('renewalDate', 'Renewal date must be after the start date');
    }
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
