import { Router } from 'express';
import authRoutes from './auth.js';
import adminRoutes from './admin.js';
import expertRoutes from './experts.js';
import sessionRoutes from './sessions.js';
import reviewRoutes from './reviews.js';
import postRoutes from './posts.js';
import userRoutes from './users.js';
import testimonialRoutes from './testimonials.js';
import blogRoutes from './blogs.js';
import joinRoutes from './join.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/experts', expertRoutes);
router.use('/sessions', sessionRoutes);
router.use('/reviews', reviewRoutes);
router.use('/posts', postRoutes);
router.use('/users', userRoutes);
router.use('/testimonials', testimonialRoutes);
router.use('/blogs', blogRoutes);
router.use('/join', joinRoutes);

export { router as routes };