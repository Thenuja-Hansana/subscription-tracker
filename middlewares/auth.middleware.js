import jwt from 'jsonwebtoken';

import { JWT_SECRET } from '../config/env.js';
import User from '../models/user.model.js';

// Put this in front of any route that needs a signed-in user.
// It checks the token and makes the user available as req.user.
const authorize = async (req, res, next) => {
    // The client sends the token in a header that looks like: Authorization: Bearer <token>
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Please sign in first' });
    }

    const token = header.split(' ')[1];

    let payload;

    try {
        // Throws if the token was not made by us or has expired
        payload = jwt.verify(token, JWT_SECRET);
    } catch {
        return res.status(401).json({ success: false, error: 'Your session is invalid or has expired. Please sign in again' });
    }

    const user = await User.findById(payload.userId);

    if (!user) {
        return res.status(401).json({ success: false, error: 'This account no longer exists' });
    }

    req.user = user;

    next();
};

export default authorize;
