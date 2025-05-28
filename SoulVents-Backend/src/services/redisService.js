import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', err => console.error('Redis Client Error:', err));

await redisClient.connect();

export const storeOTP = async (email, otp, type) => {
    const key = `otp:${email}:${type}`;
    const value = JSON.stringify({
        otp,
        attempts: 0
    });

    // Store OTP with 10 minute expiry
    await redisClient.setEx(key, 600, value);
};

export const verifyOTP = async (email, otp, type) => {
    const key = `otp:${email}:${type}`;
    const data = await redisClient.get(key);

    if (!data) {
        return { valid: false, reason: 'expired' };
    }

    const { otp: storedOTP, attempts } = JSON.parse(data);

    if (attempts >= 3) {
        await redisClient.del(key);
        return { valid: false, reason: 'max_attempts' };
    }

    // Increment attempts
    await redisClient.setEx(
        key,
        await redisClient.ttl(key),
        JSON.stringify({ otp: storedOTP, attempts: attempts + 1 })
    );

    if (otp !== storedOTP) {
        return { valid: false, reason: 'invalid' };
    }

    // Delete OTP after successful verification
    await redisClient.del(key);
    return { valid: true };
};

export default redisClient;