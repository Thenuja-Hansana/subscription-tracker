import { EMAIL_PASSWORD, EMAIL_USER } from '../config/env.js';
import transporter from '../config/nodemailer.js';
import { buildReminderEmail } from './email-template.js';

export const sendReminderEmail = async (reminder) => {
    const { subject, text } = buildReminderEmail(reminder);

    // Without email settings, print the email instead so the daily check can still be tried out
    if (!EMAIL_USER || !EMAIL_PASSWORD) {
        console.log(`Email is not set up, so this reminder was printed instead of sent:\nTo: ${reminder.email}\nSubject: ${subject}\n\n${text}\n`);
        return;
    }

    await transporter.sendMail({
        from: `Subscription Tracker <${EMAIL_USER}>`,
        to: reminder.email,
        subject,
        text,
    });
};
