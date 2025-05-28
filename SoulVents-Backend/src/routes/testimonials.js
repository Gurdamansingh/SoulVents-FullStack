import { Router } from 'express';
import { testimonialOperations } from '../db/testimonials.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = Router();

// Get all approved testimonials
router.get('/', async (req, res) => {
    try {
        const testimonials = await testimonialOperations.getAllTestimonials(true);
        res.json(testimonials);
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
});

// Get recent testimonials (for homepage)
router.get('/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 3;
        const testimonials = await testimonialOperations.getRecentTestimonials(limit);
        res.json(testimonials);
    } catch (error) {
        console.error('Error fetching recent testimonials:', error);
        res.status(500).json({ error: 'Failed to fetch recent testimonials' });
    }
});

// Get featured testimonials
router.get('/featured', async (req, res) => {
    try {
        const testimonials = await testimonialOperations.getFeaturedTestimonials();
        res.json(testimonials);
    } catch (error) {
        console.error('Error fetching featured testimonials:', error);
        res.status(500).json({ error: 'Failed to fetch featured testimonials' });
    }
});

// Submit a new testimonial
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, location, image, rating, title, content, tags, expertType } = req.body;

        // Validate required fields
        if (!name || !rating || !title || !content) {
            return res.status(400).json({ error: 'Name, rating, title, and content are required' });
        }

        // Validate rating
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Create testimonial
        const testimonial = await testimonialOperations.createTestimonial(
            req.user.id,
            name,
            location || null,
            image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user.id}`,
            rating,
            title,
            content,
            tags || [],
            expertType || null
        );

        res.status(201).json({
            ...testimonial,
            message: 'Thank you for your testimonial! It will be reviewed before being published.'
        });
    } catch (error) {
        console.error('Error submitting testimonial:', error);
        res.status(500).json({ error: 'Failed to submit testimonial' });
    }
});

// Admin routes
// Get all testimonials (including unapproved)
router.get('/admin', authenticateToken, isAdmin, async (req, res) => {
    try {
        const testimonials = await testimonialOperations.getAllTestimonials(false);
        res.json(testimonials);
    } catch (error) {
        console.error('Error fetching all testimonials:', error);
        res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
});

// Approve a testimonial
router.put('/:id/approve', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { featured } = req.body;
        await testimonialOperations.approveTestimonial(req.params.id, featured);
        res.json({ message: 'Testimonial approved successfully' });
    } catch (error) {
        console.error('Error approving testimonial:', error);
        res.status(500).json({ error: 'Failed to approve testimonial' });
    }
});

// Delete a testimonial
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        await testimonialOperations.deleteTestimonial(req.params.id);
        res.json({ message: 'Testimonial deleted successfully' });
    } catch (error) {
        console.error('Error deleting testimonial:', error);
        res.status(500).json({ error: 'Failed to delete testimonial' });
    }
});

export default router;