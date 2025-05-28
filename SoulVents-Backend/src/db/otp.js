import { randomUUID } from 'crypto';

export const otpOperations = {
    createOTP: async (email, otp, type) => {
        try {
            const id = randomUUID();
            await db.execute({
                sql: `INSERT INTO otp_requests (
                id, email, otp, expires_at, type
              ) VALUES (?, ?, ?, datetime('now', '+10 minutes'), ?)`,
                args: [id, email, otp, type]
            });
            return { id, email, otp };
        } catch (error) {
            console.error('Error creating OTP:', error);
            throw error;
        }
    },

    verifyOTP: async (email, otp, type) => {
        try {
            const result = await db.execute({
                sql: `SELECT * FROM otp_requests 
              WHERE email = ? 
              AND otp = ? 
              AND type = ?
              AND verified = 0 
              AND expires_at > datetime('now')
              AND attempts < 3
              ORDER BY created_at DESC 
              LIMIT 1`,
                args: [email, otp, type]
            });

            if (!result.rows.length) {
                // Increment attempts
                await db.execute({
                    sql: `UPDATE otp_requests 
                SET attempts = attempts + 1 
                WHERE email = ? 
                AND verified = 0 
                AND expires_at > datetime('now')`,
                    args: [email]
                });
                return null;
            }

            // Mark OTP as verified
            await db.execute({
                sql: `UPDATE otp_requests SET verified = 1 WHERE id = ?`,
                args: [result.rows[0].id]
            });

            return result.rows[0];
        } catch (error) {
            console.error('Error verifying OTP:', error);
            throw error;
        }
    },

    cleanupExpiredOTPs: async () => {
        try {
            await db.execute(`
        DELETE FROM otp_requests
        WHERE expires_at < datetime('now')
        OR (verified = 0 AND attempts >= 3)
      `);
        } catch (error) {
            console.error('Error cleaning up expired OTPs:', error);
            throw error;
        }
    }
};

// This is needed for the db variable to be accessible in this module
let db;
export const setDb = (database) => {
    db = database;
};