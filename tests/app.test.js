import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';

describe('app', () => {
    it('answers on the home route', async () => {
        const response = await request(app).get('/');

        expect(response.status).toBe(200);
        expect(response.text).toBe('Welcome to the Subscription Tracker API');
    });

    it('returns a JSON 404 for a route that does not exist', async () => {
        const response = await request(app).get('/does-not-exist');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ success: false, error: 'Route not found' });
    });

    it('returns a JSON 400 when the request body is not valid JSON', async () => {
        const response = await request(app)
            .post('/')
            .set('Content-Type', 'application/json')
            .send('{ not valid json');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    it('is connected to the in-memory test database', () => {
        // 1 means "connected" in Mongoose
        expect(mongoose.connection.readyState).toBe(1);
    });
});
