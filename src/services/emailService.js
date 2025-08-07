import nodemailer from 'nodemailer';
import 'dotenv/config';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const sendOtpEmail = async (to, otp, userName = 'User') => {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to,
    subject: 'Johri Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello ${userName},</p>
        <p>You have requested to reset your password for your Johri account.</p>
        
        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h3 style="margin: 0; color: #007bff;">Your OTP Code</h3>
          <h1 style="margin: 10px 0; font-size: 36px; letter-spacing: 5px; color: #333;">${otp}</h1>
          <p style="margin: 0; color: #666;">This code expires in 5 minutes</p>
        </div>
        
        <p><strong>Security Notice:</strong></p>
        <ul>
          <li>This OTP is valid for 5 minutes only</li>
          <li>You have maximum 5 attempts to enter the correct OTP</li>
          <li>If you didn't request this reset, please ignore this email</li>
        </ul>
        
        <p>Best regards,<br>Johri Security Team</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${to}`);
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send OTP email');
  }
};

export const sendResetConfirmationEmail = async (to, userName = 'User') => {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to,
    subject: 'Johri Password Reset Successful',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Password Reset Successful</h2>
        <p>Hello ${userName},</p>
        <p>Your Johri account password has been successfully reset.</p>
        
        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>✓ Password Reset Completed</strong></p>
          <p style="margin: 5px 0 0 0;">Date: ${new Date().toLocaleString()}</p>
        </div>
        
        <p><strong>Security Alert:</strong> If you did not perform this action, please contact our support team immediately.</p>
        
        <p>You can now log in with your new password.</p>
        
        <p>Best regards,<br>Johri Security Team</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent to ${to}`);
  } catch (error) {
    console.error('Confirmation email failed:', error);
  }
};
