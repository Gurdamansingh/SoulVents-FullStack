import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const generateWelcomeEmailHTML = (name, email, password, role) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #F43F5E;">Welcome to SoulVents!</h2>
    <p>Dear ${name},</p>
    <p>Welcome to SoulVents as a ${role}. We're excited to have you join our platform!</p>
    <div style="background-color: #F9FAFB; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0;"><strong>Your Login Credentials:</strong></p>
      <p style="margin: 8px 0;">Email: ${email}</p>
      <p style="margin: 8px 0;">Password: ${password}</p>
    </div>
    <p>Please log in using these credentials and change your password for security.</p>
    <p style="color: #6B7280; font-size: 12px; margin-top: 20px;">
      This is a system-generated email. Please do not reply.
    </p>
  </div>
`;

dotenv.config();

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify transporter connection
try {
  await transporter.verify();
  console.log('SMTP server is ready to send emails');
} catch (error) {
  console.error('SMTP connection error:', error);
}

export const sendOTP = async (email, otp) => {
  try {
    console.log('Attempting to send OTP to:', email);
    console.log('SMTP Configuration:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"SoulVents Support" <support@soulvents.com>',
      to: email,
      subject: 'Your Login OTP for SoulVents',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F43F5E;">SoulVents Login Verification</h2>
          <p>Your one-time password (OTP) for login is:</p>
          <div style="background-color: #F9FAFB; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #F43F5E; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #6B7280; font-size: 12px;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `
    });

    console.log('OTP email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error.message, error.stack);
    console.error('SMTP Configuration:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM
    });
    throw new Error('Failed to send OTP email');
  }
};

export const sendJoinRequestEmail = async (data) => {
  try {
    const emailContent = generateJoinRequestEmailHTML(data);
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: 'support@soulvents.com',
      subject: `New ${data.type} Application - ${data.fullName}`,
      html: emailContent
    });

    return true;
  } catch (error) {
    console.error('Error sending join request email:', error);
    throw new Error('Failed to send join request email');
  }
};

const generateJoinRequestEmailHTML = (data) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #F43F5E;">New ${data.type} Application</h2>
    
    <div style="background-color: #F9FAFB; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <h3 style="margin-top: 0;">Personal Information</h3>
      <p><strong>Name:</strong> ${data.fullName}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone}</p>
    </div>

    <div style="background-color: #F9FAFB; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <h3 style="margin-top: 0;">Professional Information</h3>
      <p><strong>Type:</strong> ${data.type}</p>
      <p><strong>Specialty:</strong> ${data.specialty}</p>
      <p><strong>Experience:</strong> ${data.experience}</p>
      ${data.qualifications ? `<p><strong>Qualifications:</strong> ${data.qualifications}</p>` : ''}
      ${data.licenseNumber ? `<p><strong>License Number:</strong> ${data.licenseNumber}</p>` : ''}
      <p><strong>Languages:</strong> ${data.languages.join(', ')}</p>
    </div>

    <div style="background-color: #F9FAFB; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <h3 style="margin-top: 0;">Bio</h3>
      <p>${data.bio}</p>
    </div>
  </div>
`;
export const sendWelcomeEmail = async (email, name, password, role) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"SoulVents Support" <support@soulvents.com>',
      to: email,
      subject: `Welcome to SoulVents as ${role}`,
      html: generateWelcomeEmailHTML(name, email, password, role)
    });

    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw new Error('Failed to send welcome email');
  }
};