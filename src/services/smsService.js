import 'dotenv/config';

// In a real application, you would use an SMS gateway provider like Twilio.
// For now, we'll just log to the console.

export const sendOtpSms = async (to, otp, userName = 'User') => {
  const message = `
    Hello ${userName},
    Your OTP for Johri password reset is: ${otp}
    This code expires in 5 minutes.
  `;

  try {
    // Replace this with your SMS gateway's API call
    console.log(`--- SIMULATING SMS to ${to} ---`);
    console.log(message);
    console.log(`--- END SMS SIMULATION ---`);
    return { success: true, messageId: `sms_${Date.now()}` };
  } catch (error) {
    console.error('SMS sending failed:', error);
    throw new Error('Failed to send OTP SMS');
  }
};

export const sendResetConfirmationSms = async (to, userName = 'User') => {
    const message = `
      Hello ${userName},
      Your password for your Johri account has been successfully reset.
      If you did not perform this action, please contact support immediately.
    `;

    try {
        console.log(`--- SIMULATING SMS to ${to} ---`);
        console.log(message);
        console.log(`--- END SMS SIMULATION ---`);
        return { success: true, messageId: `sms_${Date.now()}` };
    } catch (error) {
        console.error('Confirmation SMS failed:', error);
    }
};