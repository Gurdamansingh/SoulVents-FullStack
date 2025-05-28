import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userOperations } from '../db/users.js';
import { sendOTP } from '../services/emailService.js';
import { randomUUID } from 'crypto';
import { db } from '../db/index.js';

const router = Router();

// Request OTP for login
router.post('/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const user = await userOperations.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in database
    await db.execute({
      sql: `INSERT INTO otp_requests (email, otp, expires_at, type)
            VALUES (?, ?, datetime('now', '+10 minutes'), 'LOGIN')`,
      args: [email, otp]
    });

    // Send OTP via email
    await sendOTP(email, otp);

    res.json({ 
      message: 'OTP sent successfully',
      email: email
    });
  } catch (error) {
    console.error('Error requesting OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP and login
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Find and validate OTP
    const otpResult = await db.execute({
      sql: `SELECT * FROM otp_requests 
            WHERE email = ? 
            AND otp = ? 
            AND verified = false 
            AND expires_at > datetime('now')
            AND attempts < 3
            ORDER BY created_at DESC 
            LIMIT 1`,
      args: [email, otp]
    });

    if (!otpResult.rows.length) {
      // Increment attempts
      await db.execute({
        sql: `UPDATE otp_requests 
              SET attempts = attempts + 1 
              WHERE email = ? 
              AND verified = false 
              AND expires_at > datetime('now')`,
        args: [email]
      });
      
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as verified
    await db.execute({
      sql: `UPDATE otp_requests SET verified = true WHERE id = ?`,
      args: [otpResult.rows[0].id]
    });

    // Get user details
    const user = await userOperations.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-here',
      { expiresIn: '24h' }
    );

    // Update last login
    await userOperations.updateUserLastLogin(user.id);

    // Return user info and token
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request OTP for registration
router.post('/register/request-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email exists
    const existingUser = await userOperations.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in database
    await db.execute({
      sql: `INSERT INTO otp_requests (email, otp, expires_at, type)
            VALUES (?, ?, datetime('now', '+10 minutes'), 'REGISTRATION')`,
      args: [email, otp]
    });

    // Send OTP via email
    await sendOTP(email, otp);

    res.json({ 
      message: 'OTP sent successfully',
      email: email
    });
  } catch (error) {
    console.error('Error requesting registration OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Complete registration with OTP
router.post('/register/verify-otp', async (req, res) => {
  try {
    const { email, otp, fullName, password } = req.body;
    console.log('Received registration data:', { email, otp, fullName, hasPassword: !!password });

    if (!email || !otp || !fullName || !password) {
      console.error('Missing required fields:', { 
        hasEmail: !!email, 
        hasOTP: !!otp, 
        hasFullName: !!fullName, 
        hasPassword: !!password 
      });
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Validate full name
    if (fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Full name is too short' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Find and validate OTP
    const otpResult = await db.execute({
      sql: `SELECT * FROM otp_requests 
            WHERE email = ? 
            AND otp = ? 
            AND type = 'REGISTRATION'
            AND verified = false 
            AND expires_at > datetime('now')
            AND attempts < 3
            ORDER BY created_at DESC 
            LIMIT 1`,
      args: [email, otp]
    });

    if (!otpResult.rows.length) {
      console.error('Invalid OTP attempt for:', email);
      // Increment attempts
      await db.execute({
        sql: `UPDATE otp_requests 
              SET attempts = attempts + 1 
              WHERE email = ? 
              AND verified = false 
              AND expires_at > datetime('now')`,
        args: [email]
      });
      
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as verified
    await db.execute({
      sql: `UPDATE otp_requests SET verified = true WHERE id = ?`,
      args: [otpResult.rows[0].id]
    });

    try {
      // Create user
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = randomUUID();
      const user = await userOperations.createUser(userId, email, passwordHash, fullName);

      // Generate token
      const token = jwt.sign(
        { id: userId, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key-here',
        { expiresIn: '24h' }
      );
      console.log('User registered successfully:', { email, userId });

      res.status(201).json({
        token,
        user: {
          id: userId,
          email,
          full_name: fullName,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error verifying registration OTP:', error);
    res.status(500).json({ error: 'Failed to complete registration' });
  }
});

// Verify expert/admin password
router.post('/expert/verify-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await userOperations.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify user is an expert or admin
    if (user.role !== 'EXPERT' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-here',
      { expiresIn: '24h' }
    );

    // Update last login
    await userOperations.updateUserLastLogin(user.id);

    // Return user info and token
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Password verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
