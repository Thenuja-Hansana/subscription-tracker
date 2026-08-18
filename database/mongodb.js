import dns from 'node:dns';
import mongoose from 'mongoose';

import { DB_URI, NODE_ENV } from '../config/env.js';

const connectToDatabase = async () => {
    if (!DB_URI) {
        throw new Error(`DB_URI is missing. Add it to .env.${NODE_ENV}.local`);
    }

    // On some Windows networks Node cannot find the computer's DNS server and falls back
    // to 127.0.0.1, which cannot look up the Atlas address. Use public DNS servers instead.
    if (dns.getServers()[0] === '127.0.0.1') {
        dns.setServers(['1.1.1.1', '8.8.8.8']);
    }

    await mongoose.connect(DB_URI);

    console.log(`Connected to MongoDB in ${NODE_ENV} mode`);
};

export default connectToDatabase;
