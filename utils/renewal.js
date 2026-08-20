// Returns the date one billing period after the given date.
// Example: addOnePeriod(1 March, 'monthly') gives 1 April.
export const addOnePeriod = (date, frequency) => {
    const next = new Date(date);
    const dayOfMonth = next.getUTCDate();

    if (frequency === 'daily') {
        next.setUTCDate(next.getUTCDate() + 1);
    } else if (frequency === 'weekly') {
        next.setUTCDate(next.getUTCDate() + 7);
    } else if (frequency === 'monthly') {
        next.setUTCMonth(next.getUTCMonth() + 1);
    } else if (frequency === 'yearly') {
        next.setUTCFullYear(next.getUTCFullYear() + 1);
    } else {
        throw new Error(`Unknown frequency: ${frequency}`);
    }

    // Months have different lengths, so 31 January plus one month spills over into March.
    // When that happens, step back to the last day of the month we wanted (28 February).
    const isMonthBased = frequency === 'monthly' || frequency === 'yearly';

    if (isMonthBased && next.getUTCDate() !== dayOfMonth) {
        next.setUTCDate(0);
    }

    return next;
};

// Returns the first renewal date after the given date that is still in the future.
// Example: a monthly subscription that started 3 months ago next renews at the 4 month mark.
export const nextRenewalDate = (date, frequency) => {
    const now = new Date();
    let renewalDate = addOnePeriod(date, frequency);

    while (renewalDate <= now) {
        renewalDate = addOnePeriod(renewalDate, frequency);
    }

    return renewalDate;
};
