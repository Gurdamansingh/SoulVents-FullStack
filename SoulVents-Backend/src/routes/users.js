import { Router } from 'express';
import { db } from '../db/index.js';
import { userOperations } from '../db/users.js';
import { creditOperations } from '../db/credits.js';
import { notificationOperations } from '../db/notifications.js';
import { authenticateToken } from '../middleware/auth.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

// Load environment variables
dotenv.config();

const router = Router();

// Initialize Razorpay with environment variables
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const profile = await db.execute({
            sql: `SELECT p.*, u.email
            FROM user_profiles p
            JOIN users u ON u.id = p.user_id
            WHERE p.user_id = ?`,
            args: [req.user.id]
        });

        if (!profile.rows.length) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json(profile.rows[0]);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { fullName } = req.body;

        // Update profile
        await db.execute({
            sql: `UPDATE user_profiles
            SET full_name = ?
            WHERE user_id = ?`,
            args: [fullName, req.user.id]
        });

        // Update user
        await db.execute({
            sql: `UPDATE users
            SET full_name = ?
            WHERE id = ?`,
            args: [fullName, req.user.id]
        });

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create order for credits purchase
router.post('/create-order', authenticateToken, async (req, res) => {
    try {
        const { amount, credits } = req.body;

        // Validate Razorpay configuration
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.error('Razorpay credentials missing');
            return res.status(500).json({ error: 'Payment service not configured' });
        }

        const options = {
            amount: amount * 100, // amount in paise
            currency: 'INR',
            receipt: `credits_${Date.now()}`,
            notes: {
                userId: req.user.id,
                credits
            }
        };

        try {
            const order = await razorpay.orders.create(options);
            res.json({ orderId: order.id });
        } catch (razorpayError) {
            console.error('Razorpay order creation error:', razorpayError);
            res.status(500).json({ error: 'Failed to create payment order' });
        }
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Verify payment and add credits
router.post('/verify-payment', authenticateToken, async (req, res) => {
    try {
        const { orderId, paymentId, signature, credits } = req.body;

        // Validate Razorpay configuration
        if (!process.env.RAZORPAY_KEY_SECRET) {
            console.error('Razorpay secret key missing');
            return res.status(500).json({ error: 'Payment verification not configured' });
        }

        // Verify payment signature
        const text = orderId + '|' + paymentId;
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(text)
            .digest('hex');

        if (generated_signature !== signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        // Add credits to user's account
        const updatedCredits = await userOperations.updateUserCredits(req.user.id, credits);

        // Create a notification for the user
        await notificationOperations.createNotification(
            req.user.id,
            `${credits} credits have been added to your account.`
        );

        // Record the credit transaction
        await creditOperations.createCreditTransaction(
            req.user.id,
            credits,
            'purchase',
            `Purchased ${credits} credits`,
            paymentId
        );

        res.json({
            success: true,
            credits: updatedCredits
        });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

// Check user credits
router.get('/credits', authenticateToken, async (req, res) => {
    try {
        const profile = await userOperations.getUserProfile(req.user.id);

        if (!profile) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        res.json({
            credits: profile.credits,
            userId: req.user.id
        });
    } catch (error) {
        console.error('Error checking credits:', error);
        res.status(500).json({ error: 'Failed to check credits' });
    }
});

// Get credit transaction history
router.get('/credit-history', authenticateToken, async (req, res) => {
    try {
        const transactions = await creditOperations.getUserCreditTransactions(req.user.id);
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching credit history:', error);
        res.status(500).json({ error: 'Failed to fetch credit history' });
    }
});

// Get user notifications
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const result = await db.execute({
            sql: `SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 20`,
            args: [req.user.id]
        });

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark notification as read
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verify the notification belongs to the user
        const notification = await db.execute({
            sql: `SELECT * FROM notifications WHERE id = ? AND user_id = ?`,
            args: [id, req.user.id]
        });

        if (!notification.rows.length) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await db.execute({
            sql: `UPDATE notifications SET is_read = 1 WHERE id = ?`,
            args: [id]
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Mark all notifications as read
router.put('/notifications/read-all', authenticateToken, async (req, res) => {
    try {
        await db.execute({
            sql: `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
            args: [req.user.id]
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

export default router;