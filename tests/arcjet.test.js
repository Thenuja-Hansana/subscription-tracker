import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import app from '../app.js';
// These two are the stand-ins from tests/setup.js, not the real Arcjet
import { apiProtection, emailProtection } from '../config/arcjet.js';

const newUser = { name: 'Test User', email: 'test@example.com', password: 'password123' };

// What Arcjet answers when it blocks a request for the given reason
const denied = (reason) => ({
    isDenied: () => true,
    isErrored: () => false,
    reason: {
        isRateLimit: () => reason === 'rate limit',
        isBot: () => reason === 'bot',
        isEmail: () => reason === 'email',
    },
});

// What Arcjet answers when it could not make a decision
const errored = {
    isDenied: () => false,
    isErrored: () => true,
    reason: { message: 'Arcjet is unreachable' },
};

afterEach(() => {
    vi.clearAllMocks();
});

describe('protection on every request', () => {
    it('lets a normal request through', async () => {
        const response = await request(app).get('/');

        expect(response.status).toBe(200);
    });

    it('uses up one request from the rate limit each time', async () => {
        await request(app).get('/');

        expect(apiProtection.protect).toHaveBeenCalledTimes(1);
        expect(apiProtection.protect).toHaveBeenCalledWith(expect.anything(), { requested: 1 });
    });

    it('returns 429 when there are too many requests', async () => {
        apiProtection.protect.mockResolvedValueOnce(denied('rate limit'));

        const response = await request(app).get('/');

        expect(response.status).toBe(429);
        expect(response.body).toEqual({ success: false, error: 'Too many requests. Please slow down' });
    });

    it('returns 403 for a bot', async () => {
        apiProtection.protect.mockResolvedValueOnce(denied('bot'));

        const response = await request(app).get('/');

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ success: false, error: 'Bots are not allowed' });
    });

    it('returns 403 when blocked for any other reason', async () => {
        apiProtection.protect.mockResolvedValueOnce(denied('something else'));

        const response = await request(app).get('/');

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ success: false, error: 'Access denied' });
    });

    it('blocks before the route runs', async () => {
        apiProtection.protect.mockResolvedValueOnce(denied('rate limit'));

        const response = await request(app).post('/api/v1/auth/sign-up').send(newUser);
        const signIn = await request(app).post('/api/v1/auth/sign-in').send(newUser);

        expect(response.status).toBe(429);
        // No account was created, so signing in fails
        expect(signIn.status).toBe(401);
    });

    it('still works when Arcjet has a problem', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        apiProtection.protect.mockResolvedValueOnce(errored);

        const response = await request(app).get('/');

        expect(response.status).toBe(200);
        expect(consoleError).toHaveBeenCalledWith('Arcjet error:', 'Arcjet is unreachable');

        consoleError.mockRestore();
    });
});

describe('email check on sign up', () => {
    it('sends the email to Arcjet', async () => {
        await request(app).post('/api/v1/auth/sign-up').send(newUser);

        expect(emailProtection.protect).toHaveBeenCalledWith(expect.anything(), { email: 'test@example.com' });
    });

    it('rejects an email Arcjet does not accept and creates no account', async () => {
        emailProtection.protect.mockResolvedValueOnce(denied('email'));

        const response = await request(app).post('/api/v1/auth/sign-up').send(newUser);
        const signIn = await request(app).post('/api/v1/auth/sign-in').send(newUser);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ success: false, error: 'Please use a real, permanent email address' });
        expect(signIn.status).toBe(401);
    });

    it('still signs up when Arcjet has a problem', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        emailProtection.protect.mockResolvedValueOnce(errored);

        const response = await request(app).post('/api/v1/auth/sign-up').send(newUser);

        expect(response.status).toBe(201);

        consoleError.mockRestore();
    });

    it('is not used on sign in', async () => {
        await request(app).post('/api/v1/auth/sign-in').send(newUser);

        expect(emailProtection.protect).not.toHaveBeenCalled();
    });

    it('skips the check when no email was sent', async () => {
        const response = await request(app).post('/api/v1/auth/sign-up').send({ name: 'Test User', password: 'password123' });

        expect(emailProtection.protect).not.toHaveBeenCalled();
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Email is required');
    });
});
