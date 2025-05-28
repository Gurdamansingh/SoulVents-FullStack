import { createClient } from '@libsql/client';
import { initializeDb } from './schema.js';
import { userOperations } from './users.js';
import { expertOperations } from './experts.js';
import {sessionOperations} from './sessions.js';
import { notificationOperations } from './notifications.js';
import { creditOperations } from './credits.js';
import { testimonialOperations } from './testimonials.js';
import { blogOperations } from './blogs.js';
import { otpOperations } from './otp.js';
import { postOperations } from './posts.js';
import { reviewOperations } from './reviews.js';

const db = createClient({
    url: 'file:mental_health.db'
});

// Initialize database
await initializeDb(db);

// Set up periodic tasks
setInterval(async () => {
    try {
        await expertOperations.updateInactiveExperts(db);
    } catch (error) {
        console.error('Error in inactive experts check:', error);
    }
}, 60000);

// Combine all database operations
const dbOps = {
    ...userOperations,
    ...expertOperations,
    ...sessionOperations,
    ...notificationOperations,
    ...creditOperations,
    ...testimonialOperations,
    ...blogOperations,
    ...otpOperations,
    ...postOperations,
    ...reviewOperations
};

export { db, dbOps };