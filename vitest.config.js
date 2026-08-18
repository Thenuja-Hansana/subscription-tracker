import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Starts the in-memory database before each test file
        setupFiles: ['./tests/setup.js'],
    },
});
