import { config } from 'dotenv';

// Each environment has its own file, e.g. .env.development.local or .env.production.local
const environment = process.env.NODE_ENV || 'development';

config({ path: `.env.${environment}.local`, quiet: true });

export const NODE_ENV = environment;
export const PORT = process.env.PORT || 3000;
export const DB_URI = process.env.DB_URI;
