import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Arcjet is an online service. In tests it is replaced with a stand-in that allows every request,
// so tests never go over the internet. tests/arcjet.test.js changes its answers to test blocking.
vi.mock('../config/arcjet.js', () => {
    const allowed = { isDenied: () => false, isErrored: () => false };

    return {
        apiProtection: { protect: vi.fn(async () => allowed) },
        emailProtection: { protect: vi.fn(async () => allowed) },
    };
});

// Tests use a throwaway MongoDB that lives in memory, so they never touch the real database
let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Build the indexes (like "email must be unique") before any test runs
    await mongoose.connection.syncIndexes();
});

// Empty every collection after each test so one test cannot affect another
afterEach(async () => {
    const collections = await mongoose.connection.db.collections();

    for (const collection of collections) {
        await collection.deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});
