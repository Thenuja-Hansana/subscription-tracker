import app from './app.js';
import connectToDatabase from './database/mongodb.js';
import { PORT } from './config/env.js';
import { scheduleDailyCheck } from './config/upstash.js';

// Connect to the database first, then start accepting requests
await connectToDatabase();

app.listen(PORT, async () => {
    console.log(`The API is running on http://localhost:${PORT}`);

    // The API still works if this fails. Only the automatic daily reminders would be missing.
    try {
        await scheduleDailyCheck();
        console.log('The daily check is scheduled for 09:00 UTC every day');
    } catch (error) {
        console.error('Could not schedule the daily check:', error.message);
    }
});
