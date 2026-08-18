import mongoose from 'mongoose';

import { DB_URI, NODE_ENV } from '../config/env.js';

const connectToDatabase = async () => {
    if (!DB_URI) {
        throw new Error(`DB_URI is missing. Add it to .env.${NODE_ENV}.local`);
    }

    await mongoose.connect(DB_URI);

    console.log(`Connected to MongoDB in ${NODE_ENV} mode`);
};

export default connectToDatabase;
