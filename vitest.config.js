import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Starts the in-memory database before each test file
        setupFiles: ['./tests/setup.js'],
        // Values the tests use in place of a real .env file
        env: {
            JWT_SECRET: 'test-secret',
            ARCJET_KEY: 'test-key',
        },
    },
});
