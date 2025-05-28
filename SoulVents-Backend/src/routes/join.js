import { Router } from 'express';
import { sendJoinRequestEmail } from '../services/emailService.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      type,
      specialty,
      experience,
      qualifications,
      licenseNumber,
      languages,
      bio
    } = req.body;

    // Send email notification
    await sendJoinRequestEmail({
      fullName,
      email,
      phone,
      type,
      specialty,
      experience,
      qualifications,
      licenseNumber,
      languages,
      bio
    });

    res.json({ 
      success: true, 
      message: 'Join request submitted successfully' 
    });
  } catch (error) {
    console.error('Error processing join request:', error);
    res.status(500).json({ 
      error: 'Failed to process join request' 
    });
  }
});

export default router;