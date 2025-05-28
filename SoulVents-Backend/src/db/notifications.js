import { randomUUID } from 'crypto';

export const notificationOperations = {
    createNotification: async (userId, message) => {
        try {
            const id = randomUUID();
            await db.execute({
                sql: `INSERT INTO notifications (id, user_id, message)
              VALUES (?, ?, ?)`,
                args: [id, userId, message]
            });

            return { id, userId, message };
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }
};

// This is needed for the db variable to be accessible in this module
let db;
export const setDb = (database) => {
    db = database;
};