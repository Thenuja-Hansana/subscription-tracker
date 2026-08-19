import { afterAll, afterEach, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

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
