"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Notification_1 = __importDefault(require("../models/Notification"));
const User_1 = __importDefault(require("../models/User"));
const emailService_1 = __importDefault(require("./emailService"));
class NotificationService {
    /**
     * Create notification and optionally send email
     */
    async createNotification(payload) {
        try {
            // Create in-app notification
            const notification = await Notification_1.default.create({
                userId: payload.userId,
                type: payload.type,
                title: payload.title,
                message: payload.message,
                data: payload.data || {},
            });
            // Send email if requested
            if (payload.sendEmail) {
                const user = await User_1.default.findById(payload.userId);
                if (user) {
                    await this.sendNotificationEmail(user, payload.type, payload.data);
                }
            }
            return notification;
        }
        catch (error) {
            console.error('[NOTIFICATION] Error creating notification:', error);
            throw error;
        }
    }
    /**
     * Get user notifications
     */
    async getUserNotifications(userId, limit = 50, skip = 0) {
        try {
            return await Notification_1.default.find({ userId })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip);
        }
        catch (error) {
            console.error('[NOTIFICATION] Error fetching notifications:', error);
            throw error;
        }
    }
    /**
     * Mark notification as read
     */
    async markAsRead(notificationId) {
        try {
            return await Notification_1.default.findByIdAndUpdate(notificationId, { isRead: true }, { new: true });
        }
        catch (error) {
            console.error('[NOTIFICATION] Error marking notification as read:', error);
            throw error;
        }
    }
    /**
     * Mark all notifications as read
     */
    async markAllAsRead(userId) {
        try {
            return await Notification_1.default.updateMany({ userId, isRead: false }, { isRead: true });
        }
        catch (error) {
            console.error('[NOTIFICATION] Error marking all notifications as read:', error);
            throw error;
        }
    }
    /**
     * Get unread notification count
     */
    async getUnreadCount(userId) {
        try {
            return await Notification_1.default.countDocuments({ userId, isRead: false });
        }
        catch (error) {
            console.error('[NOTIFICATION] Error counting unread notifications:', error);
            throw error;
        }
    }
    /**
     * Send notification email
     */
    async sendNotificationEmail(user, type, data) {
        try {
            const fullName = `${user.firstName} ${user.lastName}`;
            let html = '';
            let subject = '';
            switch (type) {
                case 'payment_confirmed':
                    subject = `Investment Confirmed - Crown Ledger ${data?.planName}`;
                    html = emailService_1.default.generateInvestmentConfirmationEmailHtml(fullName, data?.planName || 'Investment', data?.investmentAmount || 0, user.currency || 'USD');
                    break;
                case 'investment_created':
                    subject = 'New Investment Created - Crown Ledger';
                    html = emailService_1.default.generateInvestmentConfirmationEmailHtml(fullName, data?.planName || 'Investment', data?.investmentAmount || 0, user.currency || 'USD');
                    break;
                case 'investment_matured':
                    subject = 'Investment Matured - Crown Ledger';
                    html = `
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
                  .success-box { background-color: #F0FDF4; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 8px; }
                  .success-box p { color: #065F46; margin: 8px 0; }
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
                      <h2>Your Investment Has Matured</h2>
                      <p>Hi ${fullName},</p>
                      <p>Great news! Your investment has reached its maturity date.</p>
                      <div class="success-box">
                        <p><strong>Investment Maturity Details:</strong></p>
                        <p>Plan: <strong>${data?.planName}</strong></p>
                        <p>Total Value: <strong>${user.currency} ${(data?.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
                        <p>Gains: <strong>${user.currency} ${(data?.gains || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
                      </div>
                      <p>You can now reinvest or withdraw your funds. Visit your Crown Ledger dashboard to manage your investments.</p>
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
                    break;
                default:
                    return; // Don't send email for unknown types
            }
            if (html && subject) {
                await emailService_1.default.sendEmail({
                    to: user.email,
                    subject,
                    html,
                });
            }
        }
        catch (error) {
            console.error('[NOTIFICATION] Error sending notification email:', error);
            // Don't throw - notifications should not fail if email fails
        }
    }
}
exports.default = new NotificationService();
