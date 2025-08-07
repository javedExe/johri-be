import userService from '../services/userService.js';
import { sendOtpSms } from '../services/smsService.js';
import { generateOTP, getOTPExpiryTime, isOTPExpired, PASSWORD_RESET } from '../utils/security.js';

export const sendLoginOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Find or create the user. This function is in the updated userService.
    const user = await userService.findOrCreateByPhoneNumber(phoneNumber);

    // Rate limiting check: prevent resending OTP for 60 seconds
    const latestOtp = await userService.getLatestPasswordResetOtp(user.id);
    if (latestOtp) {
        const timeSinceLastOtp = (new Date() - new Date(latestOtp.created_at)) / 1000;
        if (timeSinceLastOtp < 60) {
            return res.status(429).json({ message: `Please wait ${Math.ceil(60 - timeSinceLastOtp)} seconds before requesting a new OTP.` });
        }
    }

    const otp = generateOTP();
    const expiresAt = getOTPExpiryTime();

    // We reuse the password reset OTP functions for simplicity
    await userService.deletePasswordResetOtps(user.id);
    await userService.createPasswordResetOtp(user.id, otp, expiresAt);
    await sendOtpSms(user.phone_number, otp, "User");

    res.json({ message: 'An OTP has been sent to your mobile number.' });

  } catch (error) {
    console.error('Send login OTP error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyOtpAndLogin = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

        const user = await userService.findByPhoneNumber(phoneNumber);
        if (!user) {
            return res.status(404).json({ message: 'User not found. Please request an OTP first.' });
        }

        const otpRecord = await userService.getLatestPasswordResetOtp(user.id);

        if (!otpRecord || isOTPExpired(otpRecord.expires_at)) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        if (otpRecord.otp !== otp) {
            // Here, we don't implement account locking for login, just a simple invalid message.
            return res.status(400).json({ message: 'Please Enter a Valid OTP.' });
        }

        // OTP is correct, log the user in.
        // The `req.logIn` function is from Passport.js and creates a session.
        req.logIn(user, (err) => {
            if (err) {
                console.error('Login error:', err);
                return res.status(500).json({ message: 'Login failed' });
            }
            // Clear the used OTP
            userService.deletePasswordResetOtps(user.id);
            return res.json({ message: 'Login Successful.', user: { id: user.id, username: user.username, role_id: user.role_id } });
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};