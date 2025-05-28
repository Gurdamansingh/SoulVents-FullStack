import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export const userOperations = {
    // User operations
    findUserByEmail: async (email) => {
        try {
            const result = await db.execute({
                sql: 'SELECT * FROM users WHERE email = ?',
                args: [email]
            });
            return result.rows[0];
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    },

    createUser: async (id, email, passwordHash, fullName, role = 'USER') => {
        try {
            // Create user
            await db.execute({
                sql: `INSERT INTO users (id, email, password_hash, full_name, role)
              VALUES (?, ?, ?, ?, ?)`,
                args: [id, email, passwordHash, fullName, role]
            });

            // Create user profile
            await db.execute({
                sql: `INSERT INTO user_profiles (id, user_id, full_name, credits)
              VALUES (?, ?, ?, ?)`,
                args: [randomUUID(), id, fullName, 50]
            });

            return { id, email, fullName, role };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    },

    updateUserLastLogin: async (id) => {
        try {
            await db.execute({
                sql: 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                args: [id]
            });
        } catch (error) {
            console.error('Error updating user last login:', error);
            throw error;
        }
    },

    getAllUsers: async () => {
        try {
            const result = await db.execute('SELECT * FROM users');
            return result.rows;
        } catch (error) {
            console.error('Error getting all users:', error);
            throw error;
        }
    },

    updateUser: async (id, email, fullName, role, password_hash = null) => {
        try {
            // Build the SQL query dynamically based on whether password_hash is provided
            const sql = `
                UPDATE users
                SET email = ?, full_name = ?, role = ?
                ${password_hash ? ', password_hash = ?' : ''}
                WHERE id = ?
            `;
    
            // Build the arguments dynamically
            const args = password_hash
                ? [email, fullName, role, password_hash, id]
                : [email, fullName, role, id];
    
            await db.execute({
                sql,
                args
            });
    
            return { id, email, fullName, role, ...(password_hash && { password_hash }) };
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    },

    deleteUser: async (id) => {
        try {
            await db.execute({
                sql: 'DELETE FROM users WHERE id = ?',
                args: [id]
            });
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    getUserProfile: async (userId) => {
        try {
            const result = await db.execute({
                sql: `SELECT * FROM user_profiles WHERE user_id = ?`,
                args: [userId]
            });

            return result.rows[0];
        } catch (error) {
            console.error('Error getting user profile:', error);
            throw error;
        }
    },

    updateUserCredits: async (userId, amount) => {
        try {
            await db.execute({
                sql: `UPDATE user_profiles SET credits = credits + ? WHERE user_id = ?`,
                args: [amount, userId]
            });

            // Get updated credits
            const result = await db.execute({
                sql: `SELECT credits FROM user_profiles WHERE user_id = ?`,
                args: [userId]
            });

            return result.rows[0]?.credits || 0;
        } catch (error) {
            console.error('Error updating user credits:', error);
            throw error;
        }
    }
};

// This is needed for the db variable to be accessible in this module
let db;
export const setDb = (database) => {
    db = database;
};