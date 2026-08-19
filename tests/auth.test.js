import { describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../app.js';

const newUser = { name: 'Test User', email: 'test@example.com', password: 'password123' };

const signUp = (user = newUser) => {
    return request(app).post('/api/v1/auth/sign-up').send(user);
};

describe('sign up', () => {
    it('creates a user and returns a token', async () => {
        const response = await signUp();

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeTypeOf('string');
        expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('never sends the password back', async () => {
        const response = await signUp();

        expect(response.body.data.user.password).toBeUndefined();
    });

    it('rejects a password shorter than 8 characters', async () => {
        const response = await signUp({ ...newUser, password: 'short' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Password must be at least 8 characters');
    });

    it('rejects an invalid email', async () => {
        const response = await signUp({ ...newUser, email: 'not-an-email' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Please enter a valid email address');
    });

    it('rejects a request with no body', async () => {
        const response = await request(app).post('/api/v1/auth/sign-up');

        expect(response.status).toBe(400);
    });

    it('rejects an email that is already registered', async () => {
        await signUp();

        const response = await signUp();

        expect(response.status).toBe(409);
        expect(response.body.error).toBe('That email is already in use');
    });
});

describe('sign in', () => {
    it('returns a token for the right email and password', async () => {
        await signUp();

        const response = await request(app)
            .post('/api/v1/auth/sign-in')
            .send({ email: newUser.email, password: newUser.password });

        expect(response.status).toBe(200);
        expect(response.body.data.token).toBeTypeOf('string');
        expect(response.body.data.user.password).toBeUndefined();
    });

    it('ignores upper and lower case in the email', async () => {
        await signUp();

        const response = await request(app)
            .post('/api/v1/auth/sign-in')
            .send({ email: 'TEST@Example.com', password: newUser.password });

        expect(response.status).toBe(200);
    });

    it('rejects a wrong password', async () => {
        await signUp();

        const response = await request(app)
            .post('/api/v1/auth/sign-in')
            .send({ email: newUser.email, password: 'wrong-password' });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid email or password');
    });

    it('rejects an email that has no account', async () => {
        const response = await request(app)
            .post('/api/v1/auth/sign-in')
            .send({ email: 'nobody@example.com', password: 'password123' });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid email or password');
    });

    it('rejects an email that is not text', async () => {
        await signUp();

        // Sending an object instead of text is a known trick to match any user
        const response = await request(app)
            .post('/api/v1/auth/sign-in')
            .send({ email: { $ne: null }, password: newUser.password });

        expect(response.status).toBe(400);
    });
});

describe('get my profile', () => {
    it('returns the signed-in user', async () => {
        const { body } = await signUp();

        const response = await request(app)
            .get('/api/v1/users/me')
            .set('Authorization', `Bearer ${body.data.token}`);

        expect(response.status).toBe(200);
        expect(response.body.data.email).toBe('test@example.com');
        expect(response.body.data.password).toBeUndefined();
    });

    it('rejects a request with no token', async () => {
        const response = await request(app).get('/api/v1/users/me');

        expect(response.status).toBe(401);
    });

    it('rejects a token that is not real', async () => {
        const response = await request(app)
            .get('/api/v1/users/me')
            .set('Authorization', 'Bearer not-a-real-token');

        expect(response.status).toBe(401);
    });
});
