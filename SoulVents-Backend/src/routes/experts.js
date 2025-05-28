import { Router } from 'express';
import { expertOperations } from '../db/experts.js';
import { withdrawalOperations } from '../db/withdrawals.js';
import { expertPaymentOperations } from '../db/expertPayments.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Get all experts
router.get('/', async (req, res) => {
  try {
    const experts = await expertOperations.getAllExperts();
    res.json(experts);
  } catch (error) {
    console.error('Error fetching experts:', error);
    res.status(500).json({
      error: 'Failed to fetch experts',
      details: error.message
    });
  }
});

// Get expert profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const expert = await expertOperations.getExpertByUserId(req.user.id);
    if (!expert) {
      return res.status(404).json({ error: 'Expert profile not found' });
    }
    res.json(expert);
  } catch (error) {
    console.error('Error fetching expert profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update expert online status
router.put('/status', authenticateToken, async (req, res) => {
  try {
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const expert = await expertOperations.updateExpertStatus(req.user.id, isOnline);

    // Get fresh expert data after update
    const updatedExpert = await expertOperations.getExpertByUserId(req.user.id);
    res.json(updatedExpert);
  } catch (error) {
    console.error('Error updating expert status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get expert by ID
router.get('/:id', async (req, res) => {
  try {
    const expert = await expertOperations.getExpertById(req.params.id);
    if (!expert) {
      return res.status(404).json({ error: 'Expert not found' });
    }
    res.json(expert);
  } catch (error) {
    console.error('Error fetching expert:', error);
    res.status(500).json({ error: 'Failed to fetch expert details' });
  }
});

// Create withdrawal request
router.post('/withdrawals', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;

    // Get expert ID from user ID
    const expert = await expertOperations.getExpertByUserId(req.user.id);
    if (!expert) {
      return res.status(404).json({ error: 'Expert not found' });
    }

    const withdrawal = await withdrawalOperations.createWithdrawalRequest(expert.id, amount);
    res.json(withdrawal);
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get withdrawal history
router.get('/withdrawals', authenticateToken, async (req, res) => {
  try {
    const expert = await expertOperations.getExpertByUserId(req.user.id);
    if (!expert) {
      return res.status(404).json({ error: 'Expert not found' });
    }

    const withdrawals = await withdrawalOperations.getExpertWithdrawals(expert.id);
    res.json(withdrawals);
  } catch (error) {
    console.error('Error getting withdrawals:', error);
    res.status(500).json({ error: 'Failed to get withdrawal history' });
  }
});

// Save payment information
router.post('/payment-info', authenticateToken, async (req, res) => {
  try {
    const expert = await expertOperations.getExpertByUserId(req.user.id);
    if (!expert) {
      return res.status(404).json({ error: 'Expert not found' });
    }

    await expertPaymentOperations.savePaymentInfo(expert.id, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving payment info:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get payment information
router.get('/payment-info', authenticateToken, async (req, res) => {
  try {
    const expert = await expertOperations.getExpertByUserId(req.user.id);
    if (!expert) {
      return res.status(404).json({ error: 'Expert not found' });
    }

    const paymentInfo = await expertPaymentOperations.getPaymentInfo(expert.id);
    res.json(paymentInfo);
  } catch (error) {
    console.error('Error getting payment info:', error);
    res.status(500).json({ error: 'Failed to get payment information' });
  }
});

// Update payment information
router.put('/payment-info', authenticateToken, async (req, res) => {
  try {
    const expert = await expertOperations.getExpertByUserId(req.user.id);
    if (!expert) {
      return res.status(404).json({ error: 'Expert not found' });
    }

    await expertPaymentOperations.updatePaymentInfo(expert.id, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating payment info:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;