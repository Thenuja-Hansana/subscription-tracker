import express from 'express';

import errorMiddleware from './middlewares/error.middleware.js';

const app = express();

// Lets us read JSON sent in a request body as req.body
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Welcome to the Subscription Tracker API');
});

// Runs when none of the routes above matched the request
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});

// Must be last so it can catch errors from everything above
app.use(errorMiddleware);

export default app;
