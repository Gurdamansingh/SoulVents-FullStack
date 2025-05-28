import { randomUUID } from 'crypto';

export const withdrawalOperations = {
    createWithdrawalRequest: async (expertId, amount) => {
        try {
            // Check if expert has enough credits
            const expertResult = await db.execute({
                sql: 'SELECT credits FROM experts WHERE id = ?',
                args: [expertId]
            });

            if (!expertResult.rows.length || expertResult.rows[0].credits < amount) {
                throw new Error('Insufficient credits');
            }

            // Create withdrawal request
            const id = randomUUID();
            await db.execute({
                sql: `INSERT INTO withdrawal_requests (
          id, expert_id, amount, status, created_at
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                args: [id, expertId, amount, 'PENDING']
            });

            // Deduct credits from expert's balance
            await db.execute({
                sql: 'UPDATE experts SET credits = credits - ? WHERE id = ?',
                args: [amount, expertId]
            });

            return {
                id,
                expertId,
                amount,
                status: 'PENDING',
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error creating withdrawal request:', error);
            throw error;
        }
    },

    getExpertWithdrawals: async (expertId) => {
        try {
            const result = await db.execute({
                sql: `SELECT * FROM withdrawal_requests WHERE expert_id = ? ORDER BY created_at DESC`,
                args: [expertId]
            });

            return result.rows;
        } catch (error) {
            console.error('Error getting expert withdrawals:', error);
            throw error;
        }
    },

    updateWithdrawalStatus: async (id, status, adminId) => {
        try {
            await db.execute({
                sql: `UPDATE withdrawal_requests 
              SET status = ?, processed_at = CURRENT_TIMESTAMP, processed_by = ?
              WHERE id = ?`,
                args: [status, adminId, id]
            });

            // If rejected, refund the credits
            if (status === 'REJECTED') {
                const request = await db.execute({
                    sql: 'SELECT expert_id, amount FROM withdrawal_requests WHERE id = ?',
                    args: [id]
                });

                if (request.rows.length) {
                    await db.execute({
                        sql: 'UPDATE experts SET credits = credits + ? WHERE id = ?',
                        args: [request.rows[0].amount, request.rows[0].expert_id]
                    });
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Error updating withdrawal status:', error);
            throw error;
        }
    }
};

// This is needed for the db variable to be accessible in this module
let db;
export const setDb = (database) => {
    db = database;
};