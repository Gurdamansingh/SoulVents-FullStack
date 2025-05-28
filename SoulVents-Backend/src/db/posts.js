import { randomUUID } from 'crypto';

export const postOperations = {
    getAllPosts: async () => {
        try {
            const result = await db.execute('SELECT * FROM posts');
            return result.rows;
        } catch (error) {
            console.error('Error getting all posts:', error);
            throw error;
        }
    },

    createPost: async (id, userId, content, tags) => {
        try {
            await db.execute({
                sql: `INSERT INTO posts (id, user_id, content, tags)
              VALUES (?, ?, ?, ?)`,
                args: [id, userId, content, JSON.stringify(tags)]
            });
            return { id, userId, content, tags };
        } catch (error) {
            console.error('Error creating post:', error);
            throw error;
        }
    }
};

// This is needed for the db variable to be accessible in this module
let db;
export const setDb = (database) => {
    db = database;
};