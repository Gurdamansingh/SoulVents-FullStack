import { randomUUID } from 'crypto';

export const creditOperations = {
    checkUserCredits: async (userId, requiredCredits) => {
        try {
            const result = await db.execute({
                sql: `SELECT credits FROM user_profiles WHERE user_id = ?`,
                args: [userId]
            });

            if (!result.rows.length) {
                throw new Error('User profile not found');
            }

            const userCredits = result.rows[0].credits;
            return {
                hasEnoughCredits: userCredits >= requiredCredits,
                availableCredits: userCredits,
                requiredCredits
            };
        } catch (error) {
            console.error('Error checking user credits:', error);
            throw error;
        }
    },

    createCreditTransaction: async (userId, amount, type, description, paymentId = null, sessionId = null) => {
        try {
            const id = randomUUID();
            await db.execute({
                sql: `INSERT INTO credit_transactions (id, user_id, amount, type, description, payment_id, session_id)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: [id, userId, amount, type, description, paymentId, sessionId]
            });

            return { id, userId, amount, type, description, paymentId, sessionId };
        } catch (error) {
            console.error('Error creating credit transaction:', error);
            throw error;
        }
    },

    getUserCreditTransactions: async (userId) => {
        try {
            // Create credit_transactions table if it doesn't exist
            await db.execute(`
        CREATE TABLE IF NOT EXISTS credit_transactions (
          id TEXT PRIMARY KEY,
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          amount INTEGER NOT NULL,
          type TEXT CHECK (type IN ('purchase', 'usage')) NOT NULL,
          description TEXT NOT NULL,
          payment_id TEXT,
          session_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

            // Get purchase transactions
            const purchaseResult = await db.execute({
                sql: `SELECT ct.id, ct.amount, ct.type, ct.description, ct.created_at as timestamp, 
                    ct.payment_id, ct.session_id, NULL as expert_name
              FROM credit_transactions ct
              WHERE ct.user_id = ? AND ct.type = 'purchase'
              ORDER BY ct.created_at DESC`,
                args: [userId]
            });

            // Get usage transactions (from sessions)
            const usageResult = await db.execute({
                sql: `SELECT s.id, s.amount as amount, 'usage' as type, 
                    CASE 
                      WHEN s.type = 'CHAT' THEN 'Chat session with ' || u.full_name
                      ELSE 'Call session with ' || u.full_name
                    END as description,
                    s.end_time as timestamp, NULL as payment_id, s.id as session_id, u.full_name as expert_name
              FROM sessions s
              JOIN experts e ON s.expert_id = e.id
              JOIN users u ON e.user_id = u.id
              WHERE s.user_id = ? AND s.status = 'COMPLETED' AND s.amount IS NOT NULL
              ORDER BY s.end_time DESC`,
                args: [userId]
            });

            // Combine and sort transactions
            const transactions = [
                ...purchaseResult.rows,
                ...usageResult.rows
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            return transactions;
        } catch (error) {
            console.error('Error getting user credit transactions:', error);
            throw error;
        }
    }
};

// This is needed for the db variable to be accessible in this module
let db;
export const setDb = (database) => {
    db = database;
};