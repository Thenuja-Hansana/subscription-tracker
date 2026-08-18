import app from './app.js';
import connectToDatabase from './database/mongodb.js';
import { PORT } from './config/env.js';

// Connect to the database first, then start accepting requests
await connectToDatabase();

app.listen(PORT, () => {
    console.log(`The API is running on http://localhost:${PORT}`);
});
