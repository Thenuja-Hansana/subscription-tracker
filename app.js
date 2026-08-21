import express from 'express';

import { protectApi } from './middlewares/arcjet.middleware.js';
import errorMiddleware from './middlewares/error.middleware.js';
import authRouter from './routes/auth.routes.js';
import subscriptionRouter from './routes/subscription.routes.js';
import userRouter from './routes/user.routes.js';

const app = express();

// Lets us read JSON sent in a request body as req.body
app.use(express.json());

// req.body is undefined when a request has no JSON body.
// Use an empty object instead so controllers can always read fields from it.
app.use((req, res, next) => {
    req.body = req.body || {};
    next();
});

// Blocks bots and rate limits every route below this line
app.use(protectApi);

app.get('/', (req, res) => {
    res.send('Welcome to the Subscription Tracker API');
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/subscriptions', subscriptionRouter);

// Runs when none of the routes above matched the request
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});

// Must be last so it can catch errors from everything above
app.use(errorMiddleware);

export default app;
