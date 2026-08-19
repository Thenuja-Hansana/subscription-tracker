import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { JWT_EXPIRES_IN, JWT_SECRET } from '../config/env.js';
import User from '../models/user.model.js';

// The token is what the client sends back on later requests to prove who they are
const createToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const signUp = async (req, res) => {
    const { name, email, password } = req.body;

    if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    // Never store the real password, only a scrambled (hashed) version of it
    const hashedPassword = await bcrypt.hash(password, 10);

    // The model checks the name and email. A taken email is rejected by the error middleware.
    const user = await User.create({ name, email, password: hashedPassword });

    // Remove the hashed password before sending the user back
    user.password = undefined;

    res.status(201).json({ success: true, data: { token: createToken(user._id), user } });
};

export const signIn = async (req, res) => {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    // The password is hidden by default, so ask for it explicitly
    const user = await User.findOne({ email }).select('+password');

    // A wrong email and a wrong password get the same message,
    // so nobody can use this route to find out which emails have accounts
    if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const passwordIsCorrect = await bcrypt.compare(password, user.password);

    if (!passwordIsCorrect) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    user.password = undefined;

    res.json({ success: true, data: { token: createToken(user._id), user } });
};
