import { Request, Response } from 'express';
import User from '../models/User';
import UserInvestment from '../models/UserInvestment';
import SavingsPlan from '../models/SavingsPlan';
import AdminAuditLog from '../models/AdminAuditLog';
import investmentService from '../services/investmentService';
import savingsPlansService from '../services/savingsPlansService';
import emailService from '../services/emailService';

export class AdminController {
  /**
   * Get all users with their investment and savings balances
   * @route GET /api/admin/users-balances
   * @access Private (Admin only)
   */
  async getAllUsersBalances(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, searchQuery = '' } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const skip = (pageNum - 1) * limitNum;

      // Build search query
      let query: any = {};
      if (searchQuery) {
        query = {
          $or: [
            { email: { $regex: searchQuery, $options: 'i' } },
            { username: { $regex: searchQuery, $options: 'i' } },
            { firstName: { $regex: searchQuery, $options: 'i' } },
            { lastName: { $regex: searchQuery, $options: 'i' } },
          ],
        };
      }

      // Get total count
      const totalUsers = await User.countDocuments(query);

      // Fetch users with pagination
      const users = await User.find(query)
        .select('_id firstName lastName email username createdAt')
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 });

      // Enrich each user with investment and savings balances
      const usersWithBalances = await Promise.all(
        users.map(async (user) => {
          // Get investment balance
          const investmentSummary = await investmentService.getPortfolioSummary(
            user._id.toString()
          );

          // Get savings balance
          const savingsSummary = await savingsPlansService.getSavingsSummary(
            user._id.toString()
          );

          return {
            userId: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            username: user.username,
            createdAt: user.createdAt,
            investmentBalance: {
              totalInvested: investmentSummary.totalInvested,
              portfolioValue: investmentSummary.portfolioValue,
              totalGains: investmentSummary.totalGains,
              avgReturn: investmentSummary.avgReturn,
              activePlans: investmentSummary.activePlans,
            },
            savingsBalance: {
              balance: savingsSummary.balance,
              targetAmount: savingsSummary.targetAmount,
              totalInterestEarned: savingsSummary.totalInterestEarned,
              monthlyInterest: savingsSummary.monthlyInterest,
              activePlans: savingsSummary.activePlans,
              completedPlans: savingsSummary.completedPlans,
            },
            totalBalance: investmentSummary.portfolioValue + savingsSummary.balance,
          };
        })
      );

      res.status(200).json({
        success: true,
        data: usersWithBalances,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalUsers,
          pages: Math.ceil(totalUsers / limitNum),
        },
      });
    } catch (error) {
      const err = error as Error;
      console.error('[ADMIN] Error fetching users balances:', error);
      res.status(500).json({
        success: false,
        message: err.message || 'Error fetching users balances',
      });
    }
  }

  /**
   * Get detailed balance for a specific user
   * @route GET /api/admin/user/:userId/balance-details
   * @access Private (Admin only)
   */
  async getUserBalanceDetails(req: Request, res: Response): Promise<void> {
    try {
      const userId = Array.isArray(req.params.userId)
        ? req.params.userId[0]
        : req.params.userId;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
        return;
      }

      // Get user
      const user = await User.findById(userId).select(
        'firstName lastName email username accountType currency createdAt'
      );
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Get detailed investment data
      const investments = await UserInvestment.find({ userId });
      const investmentSummary = await investmentService.getPortfolioSummary(userId);

      // Get detailed savings data
      const savingsPlans = await SavingsPlan.find({ userId });
      const savingsSummary = await savingsPlansService.getSavingsSummary(userId);

      res.status(200).json({
        success: true,
        data: {
          user: {
            userId: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            username: user.username,
            accountType: user.accountType,
            currency: user.currency,
            createdAt: user.createdAt,
          },
          investments: {
            summary: investmentSummary,
            count: investments.length,
            details: investments.map((inv) => ({
              investmentId: inv._id,
              planName: inv.planName,
              amountInvested: inv.amountInvested,
              currentValue: inv.currentValue,
              totalGain: inv.totalGain,
              status: inv.status,
              investmentDate: inv.investmentDate,
              maturityDate: inv.maturityDate,
            })),
          },
          savings: {
            summary: savingsSummary,
            count: savingsPlans.length,
            details: savingsPlans.map((plan) => ({
              planId: plan._id,
              planName: plan.planName,
              targetAmount: plan.targetAmount,
              currentAmount: plan.currentAmount,
              status: plan.status,
              earnInterest: plan.earnInterest,
              totalInterestEarned: plan.totalInterestEarned,
            })),
          },
        },
      });
    } catch (error) {
      const err = error as Error;
      console.error('[ADMIN] Error fetching user balance details:', error);
      res.status(500).json({
        success: false,
        message: err.message || 'Error fetching user balance details',
      });
    }
  }

  /**
   * Update user's savings balance (increase/decrease)
   * @route PUT /api/admin/user/:userId/update-savings-balance
   * @access Private (Admin only)
   * @body amount: number (positive to increase, negative to decrease), reason: string
   */
  async updateUserSavingsBalance(req: Request, res: Response): Promise<void> {
    try {
      const userId = Array.isArray(req.params.userId)
        ? req.params.userId[0]
        : req.params.userId;
      const { amount, reason } = req.body;
      const adminId = (req as any).userId; // From JWT middleware

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
        return;
      }

      if (amount === undefined || amount === null) {
        res.status(400).json({
          success: false,
          message: 'Amount is required',
        });
        return;
      }

      if (typeof amount !== 'number' || amount === 0) {
        res.status(400).json({
          success: false,
          message: 'Amount must be a non-zero number',
        });
        return;
      }

      // Get user
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Get user's active savings plans
      const savingsPlans = await SavingsPlan.find({ userId, status: 'active' });

      if (savingsPlans.length === 0) {
        res.status(400).json({
          success: false,
          message: 'User has no active savings plans',
        });
        return;
      }

      // Update the first active savings plan (or distribute across plans)
      // For simplicity, we'll update the one with the highest balance
      const targetPlan = savingsPlans.reduce((prev, current) =>
        prev.currentAmount > current.currentAmount ? prev : current
      );

      const balanceBefore = targetPlan.currentAmount;
      const balanceAfter = Math.max(0, balanceBefore + amount);

      // Update plan balance
      targetPlan.currentAmount = balanceAfter;
      targetPlan.progressPercentage = Math.min(
        100,
        (balanceAfter / targetPlan.targetAmount) * 100
      );

      // Check if plan is completed
      if (balanceAfter >= targetPlan.targetAmount && balanceAfter > 0) {
        targetPlan.status = 'completed';
      }

      await targetPlan.save();

      // Notify the user after the balance is persisted. Email failure must not
      // roll back a successful admin balance update.
      try {
        if (user.email) {
          const emailHtml = emailService.generateAdminSavingsBalanceUpdateEmailHtml(
            user.firstName || 'Valued User',
            amount,
            balanceBefore,
            balanceAfter,
            targetPlan.planName,
            reason || 'Manual admin adjustment'
          );
          await emailService.sendEmail({
            to: user.email,
            subject: 'Your Savings Balance Was Updated - Crown Ledger',
            html: emailHtml,
          });
        }
      } catch (emailError) {
        console.error('[ADMIN] Error sending savings balance update email:', emailError);
      }

      // Log this admin action
      try {
        await AdminAuditLog.create({
          adminId,
          actionType: 'update_savings_balance',
          targetUserId: userId,
          details: {
            planId: targetPlan._id,
            planName: targetPlan.planName,
            amountChanged: amount,
            balanceBefore,
            balanceAfter,
            reason: reason || 'No reason provided',
          },
          timestamp: new Date(),
        });
      } catch (auditError) {
        console.error('[ADMIN] Error creating audit log:', auditError);
        // Don't fail the update if audit logging fails
      }

      res.status(200).json({
        success: true,
        message: 'Savings balance updated successfully',
        data: {
          userId,
          planId: targetPlan._id,
          planName: targetPlan.planName,
          amountChanged: amount,
          balanceBefore,
          balanceAfter,
          status: targetPlan.status,
          progressPercentage: targetPlan.progressPercentage,
          reason: reason || 'Manual admin adjustment',
        },
      });
    } catch (error) {
      const err = error as Error;
      console.error('[ADMIN] Error updating user savings balance:', error);
      res.status(500).json({
        success: false,
        message: err.message || 'Error updating user savings balance',
      });
    }
  }

  /**
   * Get admin audit logs
   * @route GET /api/admin/audit-logs
   * @access Private (Admin only)
   */
  async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 50, actionType = '', userId = '' } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 50;
      const skip = (pageNum - 1) * limitNum;

      // Build query
      let query: any = {};
      if (actionType) {
        query.actionType = actionType;
      }
      if (userId) {
        query.targetUserId = userId;
      }

      // Get total count
      const totalLogs = await AdminAuditLog.countDocuments(query);

      // Fetch logs
      const logs = await AdminAuditLog.find(query)
        .populate('adminId', 'firstName lastName email')
        .populate('targetUserId', 'firstName lastName email username')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum);

      res.status(200).json({
        success: true,
        data: logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalLogs,
          pages: Math.ceil(totalLogs / limitNum),
        },
      });
    } catch (error) {
      const err = error as Error;
      console.error('[ADMIN] Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        message: err.message || 'Error fetching audit logs',
      });
    }
  }

  /**
   * Get admin dashboard summary
   * @route GET /api/admin/dashboard-summary
   * @access Private (Admin only)
   */
  async getDashboardSummary(req: Request, res: Response): Promise<void> {
    try {
      // Total users
      const totalUsers = await User.countDocuments();

      // Total investments
      const totalInvestments = await UserInvestment.countDocuments({ status: 'active' });
      const investmentStats = await UserInvestment.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            totalInvested: { $sum: '$amountInvested' },
            totalValue: {
              $sum: {
                $cond: [
                  { $gt: ['$monthlyPerformance', []] },
                  { $arrayElemAt: ['$monthlyPerformance.value', -1] },
                  '$currentValue',
                ],
              },
            },
          },
        },
      ]);

      // Total savings
      const savingsStats = await SavingsPlan.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            totalSavings: { $sum: '$currentAmount' },
            totalTarget: { $sum: '$targetAmount' },
            averageAPY: { $avg: '$interestRate' },
            plansCount: { $sum: 1 },
          },
        },
      ]);

      const investmentData = investmentStats[0] || {
        totalInvested: 0,
        totalValue: 0,
      };
      const savingsData = savingsStats[0] || {
        totalSavings: 0,
        totalTarget: 0,
        averageAPY: 0,
        plansCount: 0,
      };

      res.status(200).json({
        success: true,
        data: {
          totalUsers,
          investments: {
            activeInvestments: totalInvestments,
            totalInvested: investmentData.totalInvested,
            portfolioValue: investmentData.totalValue,
            totalGains: investmentData.totalValue - investmentData.totalInvested,
          },
          savings: {
            activeSavingsPlans: savingsData.plansCount,
            totalSavings: savingsData.totalSavings,
            totalTarget: savingsData.totalTarget,
            averageAPY: Math.round(savingsData.averageAPY * 10) / 10,
          },
          lastUpdated: new Date(),
        },
      });
    } catch (error) {
      const err = error as Error;
      console.error('[ADMIN] Error fetching dashboard summary:', error);
      res.status(500).json({
        success: false,
        message: err.message || 'Error fetching dashboard summary',
      });
    }
  }
}

export default new AdminController();
