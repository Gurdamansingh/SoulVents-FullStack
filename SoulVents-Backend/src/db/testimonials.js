import { randomUUID } from 'crypto';

export const testimonialOperations = {
    createTestimonial: async (userId, name, location, image, rating, title, content, tags, expertType) => {
        try {
            const id = randomUUID();
            await db.execute({
                sql: `INSERT INTO testimonials (
                id, user_id, name, location, image, rating, title, content, tags, expert_type
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [id, userId, name, location, image, rating, title, content, JSON.stringify(tags), expertType]
            });

            return { id, userId, name, location, image, rating, title, content, tags, expertType };
        } catch (error) {
            console.error('Error creating testimonial:', error);
            throw error;
        }
    },

    getAllTestimonials: async (onlyApproved = true) => {
        try {
            let sql = `SELECT * FROM testimonials`;
            if (onlyApproved) {
                sql += ` WHERE approved = 1`;
            }
            sql += ` ORDER BY created_at DESC`;

            const result = await db.execute(sql);

            return result.rows.map(row => ({
                ...row,
                tags: JSON.parse(row.tags || '[]'),
                featured: Boolean(row.featured),
                approved: Boolean(row.approved)
            }));
        } catch (error) {
            console.error('Error getting testimonials:', error);
            throw error;
        }
    },

    getRecentTestimonials: async (limit = 3) => {
        try {
            const result = await db.execute({
                sql: `SELECT * FROM testimonials 
              WHERE approved = 1 
              ORDER BY created_at DESC 
              LIMIT ?`,
                args: [limit]
            });

            return result.rows.map(row => ({
                ...row,
                tags: JSON.parse(row.tags || '[]'),
                featured: Boolean(row.featured),
                approved: Boolean(row.approved)
            }));
        } catch (error) {
            console.error('Error getting recent testimonials:', error);
            throw error;
        }
    },

    getFeaturedTestimonials: async () => {
        try {
            const result = await db.execute(`
        SELECT * FROM testimonials 
        WHERE featured = 1 AND approved = 1 
        ORDER BY created_at DESC
      `);

            return result.rows.map(row => ({
                ...row,
                tags: JSON.parse(row.tags || '[]'),
                featured: Boolean(row.featured),
                approved: Boolean(row.approved)
            }));
        } catch (error) {
            console.error('Error getting featured testimonials:', error);
            throw error;
        }
    },

    approveTestimonial: async (id, featured = false) => {
        try {
            await db.execute({
                sql: `UPDATE testimonials 
              SET approved = 1, featured = ? 
              WHERE id = ?`,
                args: [featured ? 1 : 0, id]
            });

            return { success: true };
        } catch (error) {
            console.error('Error approving testimonial:', error);
            throw error;
        }
    },

    deleteTestimonial: async (id) => {
        try {
            await db.execute({
                sql: 'DELETE FROM testimonials WHERE id = ?',
                args: [id]
            });

            return { success: true };
        } catch (error) {
            console.error('Error deleting testimonial:', error);
            throw error;
        }
    }
};

// This is needed for the db variable to be accessible in this module
let db;
export const setDb = (database) => {
    db = database;
};