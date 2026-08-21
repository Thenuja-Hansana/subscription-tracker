import { apiProtection, emailProtection } from '../config/arcjet.js';
import { ARCJET_KEY } from '../config/env.js';

// Runs on every request: stops bots and clients that send too many requests
export const protectApi = async (req, res, next) => {
    // Without a key Arcjet cannot work, so skip it (a warning is printed when the server starts)
    if (!ARCJET_KEY) {
        return next();
    }

    // Every request uses up 1 from the rate limit bucket
    const decision = await apiProtection.protect(req, { requested: 1 });

    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            return res.status(429).json({ success: false, error: 'Too many requests. Please slow down' });
        }

        if (decision.reason.isBot()) {
            return res.status(403).json({ success: false, error: 'Bots are not allowed' });
        }

        return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // If Arcjet itself has a problem, let the request through instead of breaking the API
    if (decision.isErrored()) {
        console.error('Arcjet error:', decision.reason.message);
    }

    next();
};

// Runs only on sign up: rejects email addresses that are fake or throwaway
export const checkSignUpEmail = async (req, res, next) => {
    const { email } = req.body;

    // A missing email is reported by the user model, so there is nothing to check here
    if (!ARCJET_KEY || typeof email !== 'string') {
        return next();
    }

    const decision = await emailProtection.protect(req, { email });

    if (decision.isDenied() && decision.reason.isEmail()) {
        return res.status(400).json({ success: false, error: 'Please use a real, permanent email address' });
    }

    if (decision.isErrored()) {
        console.error('Arcjet error:', decision.reason.message);
    }

    next();
};
