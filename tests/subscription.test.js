import { describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../app.js';

const url = '/api/v1/subscriptions';

// Signs up a new user and returns their token
const getToken = async (email = 'owner@example.com') => {
    const response = await request(app)
        .post('/api/v1/auth/sign-up')
        .send({ name: 'Test User', email, password: 'password123' });

    return response.body.data.token;
};

const netflix = { name: 'Netflix', price: 10, frequency: 'monthly', category: 'entertainment', startDate: '2090-01-15' };

// Creates a subscription for the user who owns the token
const create = (token, subscription = netflix) => {
    return request(app).post(url).set('Authorization', `Bearer ${token}`).send(subscription);
};

describe('signing in is required', () => {
    it('rejects every subscription route without a token', async () => {
        expect((await request(app).get(url)).status).toBe(401);
        expect((await request(app).post(url).send(netflix)).status).toBe(401);
        expect((await request(app).get(`${url}/summary`)).status).toBe(401);
    });
});

describe('create a subscription', () => {
    it('saves it and fills in the defaults', async () => {
        const token = await getToken();

        const response = await create(token, { name: 'Netflix', price: 10, frequency: 'monthly' });

        expect(response.status).toBe(201);
        expect(response.body.data.name).toBe('Netflix');
        expect(response.body.data.currency).toBe('USD');
        expect(response.body.data.category).toBe('other');
        expect(response.body.data.status).toBe('active');
        expect(response.body.data.isTrial).toBe(false);
    });

    it('works out the renewal date from the start date and frequency', async () => {
        const token = await getToken();

        const response = await create(token);

        expect(response.body.data.renewalDate).toBe('2090-02-15T00:00:00.000Z');
    });

    it('gives an old subscription a renewal date in the future', async () => {
        const token = await getToken();

        const response = await create(token, { ...netflix, startDate: '2020-01-15' });

        expect(new Date(response.body.data.renewalDate) > new Date()).toBe(true);
    });

    it('keeps a renewal date that was sent', async () => {
        const token = await getToken();

        const response = await create(token, { ...netflix, renewalDate: '2090-03-01' });

        expect(response.body.data.renewalDate).toBe('2090-03-01T00:00:00.000Z');
    });

    it('rejects a missing name', async () => {
        const token = await getToken();

        const response = await create(token, { price: 10, frequency: 'monthly' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Name is required');
    });

    it('rejects a negative price', async () => {
        const token = await getToken();

        const response = await create(token, { ...netflix, price: -5 });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Price cannot be negative');
    });

    it('rejects a price that is not a number', async () => {
        const token = await getToken();

        const response = await create(token, { ...netflix, price: 'ten' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Price must be a number');
    });

    it('rejects a frequency that is not on the list', async () => {
        const token = await getToken();

        const response = await create(token, { ...netflix, frequency: 'hourly' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Frequency must be one of: daily, weekly, monthly, yearly');
    });

    it('rejects a currency that is not on the list', async () => {
        const token = await getToken();

        const response = await create(token, { ...netflix, currency: 'XYZ' });

        expect(response.status).toBe(400);
    });

    it('rejects a renewal date before the start date', async () => {
        const token = await getToken();

        const response = await create(token, { ...netflix, renewalDate: '2089-01-01' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Renewal date must be after the start date');
    });

    it('rejects a free trial with no end date', async () => {
        const token = await getToken();

        const response = await create(token, { ...netflix, isTrial: true });

        expect(response.status).toBe(400);
    });

    it('cannot be created for another user', async () => {
        const token = await getToken();
        const fakeUserId = '507f1f77bcf86cd799439011';

        const response = await create(token, { ...netflix, user: fakeUserId });

        expect(response.status).toBe(201);
        expect(response.body.data.user).not.toBe(fakeUserId);
    });
});

describe('list subscriptions', () => {
    it('returns only the subscriptions of the signed-in user', async () => {
        const ownerToken = await getToken('owner@example.com');
        const otherToken = await getToken('other@example.com');
        await create(ownerToken);
        await create(otherToken, { ...netflix, name: 'Spotify' });

        const response = await request(app).get(url).set('Authorization', `Bearer ${ownerToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Netflix');
    });

    it('puts the soonest renewal first', async () => {
        const token = await getToken();
        await create(token, { ...netflix, name: 'Later', renewalDate: '2090-06-01' });
        await create(token, { ...netflix, name: 'Sooner', renewalDate: '2090-02-01' });

        const response = await request(app).get(url).set('Authorization', `Bearer ${token}`);

        expect(response.body.data.map((subscription) => subscription.name)).toEqual(['Sooner', 'Later']);
    });

    it('can filter by status', async () => {
        const token = await getToken();
        await create(token);
        const paused = await create(token, { ...netflix, name: 'Spotify' });
        await request(app)
            .patch(`${url}/${paused.body.data._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'paused' });

        const response = await request(app).get(`${url}?status=paused`).set('Authorization', `Bearer ${token}`);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Spotify');
    });

    it('can filter by category', async () => {
        const token = await getToken();
        await create(token);
        await create(token, { ...netflix, name: 'Notion', category: 'productivity' });

        const response = await request(app).get(`${url}?category=productivity`).set('Authorization', `Bearer ${token}`);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Notion');
    });
});

describe('get one subscription', () => {
    it('returns your own subscription', async () => {
        const token = await getToken();
        const created = await create(token);

        const response = await request(app).get(`${url}/${created.body.data._id}`).set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe('Netflix');
    });

    it("hides another user's subscription", async () => {
        const ownerToken = await getToken('owner@example.com');
        const otherToken = await getToken('other@example.com');
        const created = await create(ownerToken);

        const response = await request(app).get(`${url}/${created.body.data._id}`).set('Authorization', `Bearer ${otherToken}`);

        expect(response.status).toBe(404);
    });

    it('returns 404 for an id that is not valid', async () => {
        const token = await getToken();

        const response = await request(app).get(`${url}/not-an-id`).set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
    });
});

describe('update a subscription', () => {
    it('changes the fields that were sent and keeps the rest', async () => {
        const token = await getToken();
        const created = await create(token);

        const response = await request(app)
            .patch(`${url}/${created.body.data._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ price: 15 });

        expect(response.status).toBe(200);
        expect(response.body.data.price).toBe(15);
        expect(response.body.data.name).toBe('Netflix');
    });

    it('can pause and cancel through the status', async () => {
        const token = await getToken();
        const created = await create(token);
        const path = `${url}/${created.body.data._id}`;

        const paused = await request(app).patch(path).set('Authorization', `Bearer ${token}`).send({ status: 'paused' });
        const cancelled = await request(app).patch(path).set('Authorization', `Bearer ${token}`).send({ status: 'cancelled' });

        expect(paused.body.data.status).toBe('paused');
        expect(cancelled.body.data.status).toBe('cancelled');
    });

    it('rejects a status that is not on the list', async () => {
        const token = await getToken();
        const created = await create(token);

        const response = await request(app)
            .patch(`${url}/${created.body.data._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'sleeping' });

        expect(response.status).toBe(400);
    });

    it('rejects an empty value for a field that must have one', async () => {
        const token = await getToken();
        const created = await create(token);

        const response = await request(app)
            .patch(`${url}/${created.body.data._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: null });

        expect(response.status).toBe(400);
    });

    it('rejects a start date after the renewal date', async () => {
        const token = await getToken();
        const created = await create(token);

        const response = await request(app)
            .patch(`${url}/${created.body.data._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ startDate: '2095-01-01' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Renewal date must be after the start date');
    });

    it('cannot move a subscription to another user', async () => {
        const token = await getToken();
        const created = await create(token);

        const response = await request(app)
            .patch(`${url}/${created.body.data._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ user: '507f1f77bcf86cd799439011' });

        expect(response.body.data.user).toBe(created.body.data.user);
    });

    it("cannot change another user's subscription", async () => {
        const ownerToken = await getToken('owner@example.com');
        const otherToken = await getToken('other@example.com');
        const created = await create(ownerToken);

        const response = await request(app)
            .patch(`${url}/${created.body.data._id}`)
            .set('Authorization', `Bearer ${otherToken}`)
            .send({ price: 0 });

        expect(response.status).toBe(404);
    });
});

describe('delete a subscription', () => {
    it('removes your own subscription', async () => {
        const token = await getToken();
        const created = await create(token);
        const path = `${url}/${created.body.data._id}`;

        const response = await request(app).delete(path).set('Authorization', `Bearer ${token}`);
        const afterwards = await request(app).get(path).set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(afterwards.status).toBe(404);
    });

    it("cannot delete another user's subscription", async () => {
        const ownerToken = await getToken('owner@example.com');
        const otherToken = await getToken('other@example.com');
        const created = await create(ownerToken);
        const path = `${url}/${created.body.data._id}`;

        const response = await request(app).delete(path).set('Authorization', `Bearer ${otherToken}`);
        const stillThere = await request(app).get(path).set('Authorization', `Bearer ${ownerToken}`);

        expect(response.status).toBe(404);
        expect(stillThere.status).toBe(200);
    });
});

describe('spending summary', () => {
    it('adds up monthly and yearly cost per currency and category', async () => {
        const token = await getToken();
        await create(token, { ...netflix, price: 10, frequency: 'monthly', category: 'entertainment' });
        await create(token, { ...netflix, name: 'Notion', price: 120, frequency: 'yearly', category: 'productivity' });
        await create(token, { ...netflix, name: 'Gym', price: 5, frequency: 'weekly', category: 'health', currency: 'EUR' });

        const response = await request(app).get(`${url}/summary`).set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.data.totals).toEqual({
            USD: {
                monthly: 20,
                yearly: 240,
                byCategory: {
                    entertainment: { monthly: 10, yearly: 120 },
                    productivity: { monthly: 10, yearly: 120 },
                },
            },
            EUR: {
                monthly: 21.67,
                yearly: 260,
                byCategory: {
                    health: { monthly: 21.67, yearly: 260 },
                },
            },
        });
    });

    it('leaves out paused and cancelled subscriptions', async () => {
        const token = await getToken();
        await create(token);
        const paused = await create(token, { ...netflix, name: 'Spotify', price: 50 });
        await request(app)
            .patch(`${url}/${paused.body.data._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'paused' });

        const response = await request(app).get(`${url}/summary`).set('Authorization', `Bearer ${token}`);

        expect(response.body.data.totals.USD.monthly).toBe(10);
    });

    it('lists free trials separately and does not count them yet', async () => {
        const token = await getToken();
        await create(token);
        await create(token, { ...netflix, name: 'Disney+', price: 8, isTrial: true, renewalDate: '2090-02-01' });

        const response = await request(app).get(`${url}/summary`).set('Authorization', `Bearer ${token}`);

        expect(response.body.data.totals.USD.monthly).toBe(10);
        expect(response.body.data.trials).toEqual([
            { name: 'Disney+', price: 8, currency: 'USD', frequency: 'monthly', trialEndsOn: '2090-02-01T00:00:00.000Z' },
        ]);
    });

    it("does not include another user's subscriptions", async () => {
        const ownerToken = await getToken('owner@example.com');
        const otherToken = await getToken('other@example.com');
        await create(ownerToken);

        const response = await request(app).get(`${url}/summary`).set('Authorization', `Bearer ${otherToken}`);

        expect(response.body.data).toEqual({ totals: {}, trials: [] });
    });
});
