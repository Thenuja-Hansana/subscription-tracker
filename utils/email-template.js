// Turns a date into text like "9 October 2026"
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
};

// Builds the subject and the text of a reminder email.
// The wording is different for a free trial that is about to end.
export const buildReminderEmail = (reminder) => {
    const when = reminder.daysLeft === 1 ? 'tomorrow' : `in ${reminder.daysLeft} days`;
    const date = formatDate(reminder.renewalDate);
    const cost = `${reminder.currency} ${reminder.price.toFixed(2)}`;

    if (reminder.isTrial) {
        return {
            subject: `Your ${reminder.subscriptionName} free trial ends ${when}`,
            text: [
                `Hi ${reminder.userName},`,
                '',
                `Your free trial of ${reminder.subscriptionName} ends ${when}, on ${date}.`,
                `After that you will be charged ${cost} (${reminder.frequency}).`,
                '',
                'If you do not want to pay for it, cancel before then.',
                '',
                'Subscription Tracker',
            ].join('\n'),
        };
    }

    return {
        subject: `${reminder.subscriptionName} renews ${when}`,
        text: [
            `Hi ${reminder.userName},`,
            '',
            `Your ${reminder.subscriptionName} subscription renews ${when}, on ${date}.`,
            `You will be charged ${cost} (${reminder.frequency}).`,
            '',
            'If you no longer want it, cancel before then.',
            '',
            'Subscription Tracker',
        ].join('\n'),
    };
};
