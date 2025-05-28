import { db } from './index.js';
import { setDb as setUsersDb } from './users.js';
import { setDb as setExpertsDb } from './experts.js';
import { setDb as setSessionsDb } from './sessions.js';
import { setDb as setNotificationsDb } from './notifications.js';
import { setDb as setCreditsDb } from './credits.js';
import { setDb as setTestimonialsDb } from './testimonials.js';
import { setDb as setBlogsDb } from './blogs.js';
import { setDb as setOtpDb } from './otp.js';
import { setDb as setPostsDb } from './posts.js';
import { setDb as setReviewsDb } from './reviews.js';

// Initialize all modules with the db instance
export function initializeDbModules() {
  setUsersDb(db);
  setExpertsDb(db);
  setSessionsDb(db);
  setNotificationsDb(db);
  setCreditsDb(db);
  setTestimonialsDb(db);
  setBlogsDb(db);
  setOtpDb(db);
  setPostsDb(db);
  setReviewsDb(db);
}