"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
const googleapis_1 = require("googleapis");
const OAuth2 = googleapis_1.google.auth.OAuth2;
class EmailService {
    validateOAuth2Config() {
        if (!process.env.GOOGLE_CLIENT_ID) {
            throw new Error('GOOGLE_CLIENT_ID environment variable is not set. Please configure OAuth2 credentials.');
        }
        if (!process.env.GOOGLE_CLIENT_SECRET) {
            throw new Error('GOOGLE_CLIENT_SECRET environment variable is not set. Please configure OAuth2 credentials.');
        }
        if (!process.env.GOOGLE_REFRESH_TOKEN) {
            throw new Error('GOOGLE_REFRESH_TOKEN environment variable is not set. Run "npm run generate-oauth-token" to generate it.');
        }
        if (!process.env.EMAIL_USER) {
            throw new Error('EMAIL_USER environment variable is not set. Please add your Gmail address.');
        }
    }
    async getTransporter() {
        try {
            // Validate all required OAuth2 variables
            this.validateOAuth2Config();
            const oauth2Client = new OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, 'https://developers.google.com/oauthplayground');
            oauth2Client.setCredentials({
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
            });
            const { credentials } = await oauth2Client.refreshAccessToken();
            const accessToken = credentials.access_token;
            if (!accessToken) {
                throw new Error('Failed to generate access token from refresh token');
            }
            return nodemailer_1.default.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                family: 4,
                auth: {
                    type: 'OAuth2',
                    user: process.env.EMAIL_USER,
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
                    accessToken,
                },
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[EMAIL] Error creating transporter:', errorMessage);
            throw error;
        }
    }
    async sendEmail(options) {
        try {
            const transporter = await this.getTransporter();
            await transporter.sendMail({
                from: `${process.env.EMAIL_FROM_NAME || 'BankApp'} <${process.env.EMAIL_USER}>`,
                to: options.to,
                subject: options.subject,
                html: options.html,
            });
            console.log(`[EMAIL] Email sent to ${options.to}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[EMAIL] Error sending email:', errorMessage);
            throw error;
        }
    }
    generateVerificationEmailHtml(fullName, verificationLink) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'DM Sans', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg,#F8F9FC 0%,#EEF2FF 100%); }
            .email-body { background-color: #ffffff; padding: 30px; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo-container { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; }
            .logo-img { width: 44px; height: 44px; }
            .logo-text { font-size: 18px; font-weight: 800; color: #111827; }
            .logo-text .brand { color: #FA510F; }
            .content { margin-bottom: 30px; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #FA510F 0%, #D94309 100%); color: #ffffff; text-decoration: none; border-radius: 10px; margin: 20px 0; font-weight: 600; box-shadow: 0 4px 12px rgba(250,81,15,0.3); }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
            .warning { color: #D94309; font-size: 12px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="email-body">
              <div class="header">
                <div class="logo-container">
                  <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/crown-5qzJ7RGtUeUieMErT9XJBV7XaVcLJV.png" alt="Crown Ledger" class="logo-img">
                  <div class="logo-text">Crown <span class="brand">Ledger</span></div>
                </div>
              </div>
              <div class="content">
                <h2>Welcome, ${fullName}!</h2>
                <p>Thank you for signing up with Crown Ledger. To complete your registration and verify your email address, please click the button below:</p>
                <a href="${verificationLink}" class="button">Verify Email Address</a>
                <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; color: #FA510F;">${verificationLink}</p>
                <p class="warning">⚠️ This link will expire in 24 hours. If you didn't create this account, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>&copy; 2024 Crown Ledger. All rights reserved.</p>
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    }
    generatePasswordResetEmailHtml(fullName, resetLink) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'DM Sans', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg,#F8F9FC 0%,#EEF2FF 100%); }
            .email-body { background-color: #ffffff; padding: 30px; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo-container { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; }
            .logo-img { width: 44px; height: 44px; }
            .logo-text { font-size: 18px; font-weight: 800; color: #111827; }
            .logo-text .brand { color: #FA510F; }
            .content { margin-bottom: 30px; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #FA510F 0%, #D94309 100%); color: #ffffff; text-decoration: none; border-radius: 10px; margin: 20px 0; font-weight: 600; box-shadow: 0 4px 12px rgba(250,81,15,0.3); }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
            .warning { color: #D94309; font-size: 12px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="email-body">
              <div class="header">
                <div class="logo-container">
                  <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/crown-5qzJ7RGtUeUieMErT9XJBV7XaVcLJV.png" alt="Crown Ledger" class="logo-img">
                  <div class="logo-text">Crown <span class="brand">Ledger</span></div>
                </div>
              </div>
              <div class="content">
                <h2>Password Reset Request</h2>
                <p>Hi ${fullName},</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <a href="${resetLink}" class="button">Reset Password</a>
                <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; color: #FA510F;">${resetLink}</p>
                <p class="warning">⚠️ This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your account will remain secure.</p>
              </div>
              <div class="footer">
                <p>&copy; 2024 Crown Ledger. All rights reserved.</p>
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    }
    generateWelcomeEmailHtml(fullName) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'DM Sans', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg,#F8F9FC 0%,#EEF2FF 100%); }
            .email-body { background-color: #ffffff; padding: 30px; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo-container { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; }
            .logo-img { width: 44px; height: 44px; }
            .logo-text { font-size: 18px; font-weight: 800; color: #111827; }
            .logo-text .brand { color: #FA510F; }
            .content { margin-bottom: 30px; }
            .feature-list { list-style: none; padding: 0; }
            .feature-list li { padding: 10px 0; padding-left: 28px; position: relative; color: #374151; }
            .feature-list li:before { content: "✓"; position: absolute; left: 0; color: #FA510F; font-weight: bold; font-size: 16px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="email-body">
              <div class="header">
                <div class="logo-container">
                  <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/crown-5qzJ7RGtUeUieMErT9XJBV7XaVcLJV.png" alt="Crown Ledger" class="logo-img">
                  <div class="logo-text">Crown <span class="brand">Ledger</span></div>
                </div>
              </div>
              <div class="content">
                <h2>Welcome to Crown Ledger, ${fullName}!</h2>
                <p>Your account has been successfully created and verified. You're now ready to explore all the features we have to offer.</p>
                
                <h3>What You Can Do:</h3>
                <ul class="feature-list">
                  <li>Manage multiple account types</li>
                  <li>Track your savings and investments</li>
                  <li>Make secure transactions</li>
                  <li>Access your account 24/7</li>
                  <li>Enjoy premium banking features</li>
                </ul>

                <p>If you have any questions or need assistance, our support team is here to help you.</p>
              </div>
              <div class="footer">
                <p>&copy; 2024 Crown Ledger. All rights reserved.</p>
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    }
    generateLoginNotificationEmailHtml(fullName) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'DM Sans', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg,#F8F9FC 0%,#EEF2FF 100%); }
            .email-body { background-color: #ffffff; padding: 30px; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo-container { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; }
            .logo-img { width: 44px; height: 44px; }
            .logo-text { font-size: 18px; font-weight: 800; color: #111827; }
            .logo-text .brand { color: #FA510F; }
            .content { margin-bottom: 30px; }
            .alert-box { background-color: #FFF4F0; border-left: 4px solid #FA510F; padding: 15px; margin: 20px 0; border-radius: 8px; }
            .alert-box p { color: #6B4423; margin: 8px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="email-body">
              <div class="header">
                <div class="logo-container">
                  <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/crown-5qzJ7RGtUeUieMErT9XJBV7XaVcLJV.png" alt="Crown Ledger" class="logo-img">
                  <div class="logo-text">Crown <span class="brand">Ledger</span></div>
                </div>
              </div>
              <div class="content">
                <h2>Login Notification</h2>
                <p>Hi ${fullName},</p>
                <p>Your Crown Ledger account was just accessed.</p>
                
                <div class="alert-box">
                  <p><strong>Login Details:</strong></p>
                  <p>Time: ${new Date().toLocaleString()}</p>
                  <p>If this wasn't you, please secure your account immediately by changing your password.</p>
                </div>

                <p>Your account security is important to us. If you notice any suspicious activity, please contact our support team right away.</p>
              </div>
              <div class="footer">
                <p>&copy; 2024 Crown Ledger. All rights reserved.</p>
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    }
}
exports.default = new EmailService();
