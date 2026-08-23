import { serve } from '@upstash/workflow/express';

import { findRemindersDueToday, rollForwardRenewals } from '../utils/daily-check.js';
import { sendReminderEmail } from '../utils/send-email.js';

// The daily check. Upstash calls it once a day.
//
// Each context.run is one "step". Upstash remembers the steps that finished, so if a step fails
// (for example one email could not be sent) only that step is tried again, not the whole check.
export const dailyCheck = serve(async (context) => {
    const reminders = await context.run('find-reminders', findRemindersDueToday);

    for (const reminder of reminders) {
        await context.run(`send-reminder-${reminder.subscriptionId}`, () => sendReminderEmail(reminder));
    }

    const moved = await context.run('roll-forward-renewals', rollForwardRenewals);

    console.log(`Daily check finished: ${reminders.length} reminders, ${moved} renewal dates moved forward`);
});
