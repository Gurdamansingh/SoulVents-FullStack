import { randomUUID } from 'crypto';
import crypto from 'crypto';

const encrypt = (text, key) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        tag: tag.toString('hex')
    };
};

const decrypt = (encrypted, key) => {
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(key),
        Buffer.from(encrypted.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));
    let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

export const expertPaymentOperations = {
    savePaymentInfo: async (expertId, paymentInfo) => {
        try {
            const id = randomUUID();
            const encryptionKey = process.env.ENCRYPTION_KEY || 'your-secret-key-here';

            // Encrypt sensitive data
            const encryptedAccountNumber = encrypt(paymentInfo.accountNumber, encryptionKey);
            const encryptedIfscCode = encrypt(paymentInfo.ifscCode, encryptionKey);

            await db.execute({
                sql: `INSERT INTO expert_payment_info (
          id, expert_id, bank_name, account_number, account_number_iv, 
          account_number_tag, ifsc_code, ifsc_code_iv, ifsc_code_tag,
          account_holder_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                args: [
                    id,
                    expertId,
                    paymentInfo.bankName,
                    encryptedAccountNumber.encryptedData,
                    encryptedAccountNumber.iv,
                    encryptedAccountNumber.tag,
                    encryptedIfscCode.encryptedData,
                    encryptedIfscCode.iv,
                    encryptedIfscCode.tag,
                    paymentInfo.accountHolderName
                ]
            });

            return { success: true };
        } catch (error) {
            console.error('Error saving payment info:', error);
            throw error;
        }
    },

    getPaymentInfo: async (expertId) => {
        try {
            const result = await db.execute({
                sql: `SELECT * FROM expert_payment_info WHERE expert_id = ?`,
                args: [expertId]
            });

            if (!result.rows.length) {
                return null;
            }

            const paymentInfo = result.rows[0];
            const encryptionKey = process.env.ENCRYPTION_KEY || 'your-secret-key-here';

            // Decrypt sensitive data
            const accountNumber = decrypt({
                encryptedData: paymentInfo.account_number,
                iv: paymentInfo.account_number_iv,
                tag: paymentInfo.account_number_tag
            }, encryptionKey);

            const ifscCode = decrypt({
                encryptedData: paymentInfo.ifsc_code,
                iv: paymentInfo.ifsc_code_iv,
                tag: paymentInfo.ifsc_code_tag
            }, encryptionKey);

            return {
                id: paymentInfo.id,
                bankName: paymentInfo.bank_name,
                accountNumber,
                ifscCode,
                accountHolderName: paymentInfo.account_holder_name
            };
        } catch (error) {
            console.error('Error getting payment info:', error);
            throw error;
        }
    },

    updatePaymentInfo: async (expertId, paymentInfo) => {
        try {
            const encryptionKey = process.env.ENCRYPTION_KEY || 'your-secret-key-here';

            // Encrypt sensitive data
            const encryptedAccountNumber = encrypt(paymentInfo.accountNumber, encryptionKey);
            const encryptedIfscCode = encrypt(paymentInfo.ifscCode, encryptionKey);

            await db.execute({
                sql: `UPDATE expert_payment_info 
              SET bank_name = ?,
                  account_number = ?,
                  account_number_iv = ?,
                  account_number_tag = ?,
                  ifsc_code = ?,
                  ifsc_code_iv = ?,
                  ifsc_code_tag = ?,
                  account_holder_name = ?
              WHERE expert_id = ?`,
                args: [
                    paymentInfo.bankName,
                    encryptedAccountNumber.encryptedData,
                    encryptedAccountNumber.iv,
                    encryptedAccountNumber.tag,
                    encryptedIfscCode.encryptedData,
                    encryptedIfscCode.iv,
                    encryptedIfscCode.tag,
                    paymentInfo.accountHolderName,
                    expertId
                ]
            });

            return { success: true };
        } catch (error) {
            console.error('Error updating payment info:', error);
            throw error;
        }
    }
};

// This is needed for the db variable to be accessible in this module
let db;
export const setDb = (database) => {
    db = database;
};