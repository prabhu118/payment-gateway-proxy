import dotenv from 'dotenv';
import { createApp } from './app';

// Load environment variables before anything else
dotenv.config({ quiet: true });

const PORT = process.env.PORT || 3000;

const app = createApp();

app.listen(PORT, () => {
    console.log(`Payment Gateway Proxy running on port ${PORT}`);
});