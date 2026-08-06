"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const User_1 = __importDefault(require("../models/User"));
const UserInvestment_1 = __importDefault(require("../models/UserInvestment"));
const SavingsPlan_1 = __importDefault(require("../models/SavingsPlan"));
const AdminAuditLog_1 = __importDefault(require("../models/AdminAuditLog"));
const investmentService_1 = __importDefault(require("../services/investmentService"));
const savingsPlansService_1 = __importDefault(require("../services/savingsPlansService"));
const emailService_1 = __importDefault(require("../services/emailService"));
class AdminController {
    /**
     * Get all users with their investment and savings balances
     * @route GET /api/admin/users-balances
     * @access Private (Admin only)
     */
    async getAllUsersBalances(req, res) {
        try {
            const { page = 1, limit = 20, searchQuery = '' } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 20;
            const skip = (pageNum - 1) * limitNum;
            // Build search query
            let query = {};
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
            const totalUsers = await User_1.default.countDocuments(query);
            // Fetch users with pagination
            const users = await User_1.default.find(query)
                .select('_id firstName lastName email username createdAt')
                .skip(skip)
                .limit(limitNum)
                .sort({ createdAt: -1 });
            // Enrich each user with investment and savings balances
            const usersWithBalances = await Promise.all(users.map(async (user) => {
                // Get investment balance
                const investmentSummary = await investmentService_1.default.getPortfolioSummary(user._id.toString());
                // Get savings balance
                const savingsSummary = await savingsPlansService_1.default.getSavingsSummary(user._id.toString());
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
            }));
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
        }
        catch (error) {
            const err = error;
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
    async getUserBalanceDetails(req, res) {
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
            const user = await User_1.default.findById(userId).select('firstName lastName email username accountType currency createdAt');
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
                return;
            }
            // Get detailed investment data
            const investments = await UserInvestment_1.default.find({ userId });
            const investmentSummary = await investmentService_1.default.getPortfolioSummary(userId);
            // Get detailed savings data
            const savingsPlans = await SavingsPlan_1.default.find({ userId });
            const savingsSummary = await savingsPlansService_1.default.getSavingsSummary(userId);
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
        }
        catch (error) {
            const err = error;
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
    async updateUserSavingsBalance(req, res) {
        try {
            const userId = Array.isArray(req.params.userId)
                ? req.params.userId[0]
                : req.params.userId;
            const { amount, reason } = req.body;
            const adminId = req.userId; // From JWT middleware
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
            const user = await User_1.default.findById(userId);
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
                return;
            }
            // Get user's active savings plans
            const savingsPlans = await SavingsPlan_1.default.find({ userId, status: 'active' });
            if (savingsPlans.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'User has no active savings plans',
                });
                return;
            }
            // Update the first active savings plan (or distribute across plans)
            // For simplicity, we'll update the one with the highest balance
            const targetPlan = savingsPlans.reduce((prev, current) => prev.currentAmount > current.currentAmount ? prev : current);
            const balanceBefore = targetPlan.currentAmount;
            const balanceAfter = Math.max(0, balanceBefore + amount);
            // Update plan balance
            targetPlan.currentAmount = balanceAfter;
            targetPlan.progressPercentage = Math.min(100, (balanceAfter / targetPlan.targetAmount) * 100);
            // Check if plan is completed
            if (balanceAfter >= targetPlan.targetAmount && balanceAfter > 0) {
                targetPlan.status = 'completed';
            }
            await targetPlan.save();
            // Notify the user after the balance is persisted. Email failure must not
            // roll back a successful admin balance update.
            try {
                if (user.email) {
                    const emailHtml = emailService_1.default.generateAdminSavingsBalanceUpdateEmailHtml(user.firstName || 'Valued User', amount, balanceBefore, balanceAfter, targetPlan.planName, reason || 'Manual admin adjustment');
                    await emailService_1.default.sendEmail({
                        to: user.email,
                        subject: 'Your Savings Balance Was Updated - Crown Ledger',
                        html: emailHtml,
                    });
                }
            }
            catch (emailError) {
                console.error('[ADMIN] Error sending savings balance update email:', emailError);
            }
            // Log this admin action
            try {
                await AdminAuditLog_1.default.create({
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
            }
            catch (auditError) {
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
        }
        catch (error) {
            const err = error;
            console.error('[ADMIN] Error updating user savings balance:', error);
            res.status(500).json({
                success: false,
                message: err.message || 'Error updating user savings balance',
            });
        }
    }
    /**
     * Update a user's investment current value and notify them by email.
     * @route PUT /api/admin/user/:userId/update-investment-balance
     * @access Private (Admin only)
     * @body amount: number (positive to increase, negative to decrease), investmentId?: string, reason?: string
     */
    async updateUserInvestmentBalance(req, res) {
        try {
            const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
            const { amount, investmentId, reason } = req.body;
            const adminId = req.userId;
            if (!userId) {
                res.status(400).json({ success: false, message: 'User ID is required' });
                return;
            }
            if (typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0) {
                res.status(400).json({ success: false, message: 'Amount must be a non-zero number' });
                return;
            }
            const user = await User_1.default.findById(userId);
            if (!user) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }
            const investmentQuery = { userId, status: 'active' };
            if (investmentId)
                investmentQuery._id = investmentId;
            const investments = await UserInvestment_1.default.find(investmentQuery);
            if (investments.length === 0) {
                res.status(400).json({ success: false, message: 'User has no matching active investments' });
                return;
            }
            const targetInvestment = investments.reduce((prev, current) => prev.currentValue > current.currentValue ? prev : current);
            const balanceBefore = targetInvestment.currentValue;
            const balanceAfter = Math.max(0, Math.round((balanceBefore + amount) * 100) / 100);
            targetInvestment.currentValue = balanceAfter;
            targetInvestment.totalGain = Math.round((balanceAfter - targetInvestment.amountInvested) * 100) / 100;
            targetInvestment.gainPercentage = targetInvestment.amountInvested > 0
                ? Math.round((targetInvestment.totalGain / targetInvestment.amountInvested) * 10000) / 100
                : 0;
            await targetInvestment.save();
            try {
                if (user.email) {
                    const html = emailService_1.default.generateAdminInvestmentBalanceUpdateEmailHtml(user.firstName || 'Valued User', amount, balanceBefore, balanceAfter, targetInvestment.planName, reason || 'Manual admin adjustment');
                    await emailService_1.default.sendEmail({
                        to: user.email,
                        subject: 'Your Investment Balance Was Updated - Crown Ledger',
                        html,
                    });
                }
            }
            catch (emailError) {
                console.error('[ADMIN] Error sending investment balance update email:', emailError);
            }
            try {
                await AdminAuditLog_1.default.create({
                    adminId,
                    actionType: 'update_investment_balance',
                    targetUserId: userId,
                    details: {
                        investmentId: targetInvestment._id,
                        planName: targetInvestment.planName,
                        amountChanged: amount,
                        balanceBefore,
                        balanceAfter,
                        reason: reason || 'No reason provided',
                    },
                    timestamp: new Date(),
                });
            }
            catch (auditError) {
                console.error('[ADMIN] Error creating investment audit log:', auditError);
            }
            res.status(200).json({
                success: true,
                message: 'Investment balance updated successfully',
                data: {
                    userId,
                    investmentId: targetInvestment._id,
                    planName: targetInvestment.planName,
                    amountChanged: amount,
                    balanceBefore,
                    balanceAfter,
                    totalGain: targetInvestment.totalGain,
                    gainPercentage: targetInvestment.gainPercentage,
                    reason: reason || 'Manual admin adjustment',
                },
            });
        }
        catch (error) {
            const err = error;
            console.error('[ADMIN] Error updating user investment balance:', error);
            res.status(500).json({ success: false, message: err.message || 'Error updating user investment balance' });
        }
    }
    /**
     * Get admin audit logs
     * @route GET /api/admin/audit-logs
     * @access Private (Admin only)
     */
    async getAuditLogs(req, res) {
        try {
            const { page = 1, limit = 50, actionType = '', userId = '' } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const skip = (pageNum - 1) * limitNum;
            // Build query
            let query = {};
            if (actionType) {
                query.actionType = actionType;
            }
            if (userId) {
                query.targetUserId = userId;
            }
            // Get total count
            const totalLogs = await AdminAuditLog_1.default.countDocuments(query);
            // Fetch logs
            const logs = await AdminAuditLog_1.default.find(query)
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
        }
        catch (error) {
            const err = error;
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
    async getDashboardSummary(req, res) {
        try {
            // Total users
            const totalUsers = await User_1.default.countDocuments();
            // Total investments
            const totalInvestments = await UserInvestment_1.default.countDocuments({ status: 'active' });
            const investmentStats = await UserInvestment_1.default.aggregate([
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
            const savingsStats = await SavingsPlan_1.default.aggregate([
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
        }
        catch (error) {
            const err = error;
            console.error('[ADMIN] Error fetching dashboard summary:', error);
            res.status(500).json({
                success: false,
                message: err.message || 'Error fetching dashboard summary',
            });
        }
    }
}
exports.AdminController = AdminController;
exports.default = new AdminController();
