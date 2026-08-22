import nodemailer from 'nodemailer';

import { EMAIL_PASSWORD, EMAIL_USER } from './env.js';

// Sends email through a Gmail account.
// EMAIL_PASSWORD is a Gmail "app password", not the password used to sign in to Gmail.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
    },
});

export default transporter;
