"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvestmentController = void 0;
const investmentService_1 = __importDefault(require("../services/investmentService"));
const cashAppService_1 = __importDefault(require("../services/cashAppService"));
const bitcoinService_1 = __importDefault(require("../services/bitcoinService"));
const Payment_1 = __importDefault(require("../models/Payment"));
const Notification_1 = __importDefault(require("../models/Notification"));
const emailService_1 = __importDefault(require("../services/emailService"));
const User_1 = __importDefault(require("../models/User"));
class InvestmentController {
    /**
     * Get all investment plans
     */
    async getAllPlans(req, res) {
        try {
            const plans = await investmentService_1.default.getAllPlans();
            res.status(200).json({
                success: true,
                data: plans,
            });
        }
        catch (error) {
            const err = error;
            res.status(500).json({
                success: false,
                message: err.message,
            });
        }
    }
    /**
     * Get investment plan by ID
     */
    async getPlanById(req, res) {
        try {
            const planId = Array.isArray(req.params.planId) ? req.params.planId[0] : req.params.planId;
            const plan = await investmentService_1.default.getPlanById(planId);
            if (!plan) {
                res.status(404).json({
                    success: false,
                    message: 'Investment plan not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: plan,
            });
        }
        catch (error) {
            const err = error;
            res.status(500).json({
                success: false,
                message: err.message,
            });
        }
    }
    /**
     * Initialize investment payment with Cash App or Bitcoin
     */
    async initializePayment(req, res) {
        try {
            const { userId, planId, amount, paymentMethod = 'cashapp' } = req.body;
            // Validate input
            if (!userId || !planId || !amount) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: userId, planId, amount',
                });
                return;
            }
            // Validate payment method
            if (!['cashapp', 'bitcoin'].includes(paymentMethod)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid payment method. Must be either "cashapp" or "bitcoin"',
                });
                return;
            }
            // Verify plan exists and validate minimum investment
            const plan = await investmentService_1.default.getPlanById(planId);
            if (!plan) {
                res.status(404).json({
                    success: false,
                    message: 'Investment plan not found',
                });
                return;
            }
            if (amount < plan.minInvestment) {
                res.status(400).json({
                    success: false,
                    message: `Minimum investment for ${plan.name} is $${plan.minInvestment}`,
                });
                return;
            }
            // Verify user exists
            const user = await User_1.default.findById(userId);
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
                return;
            }
            // Create payment request based on payment method
            let paymentRequest;
            if (paymentMethod === 'bitcoin') {
                paymentRequest = await bitcoinService_1.default.createPaymentRequest(userId, planId, amount, plan.name);
                res.status(200).json({
                    success: true,
                    data: {
                        paymentId: paymentRequest.paymentId,
                        paymentReference: paymentRequest.paymentReference,
                        paymentMethod: 'bitcoin',
                        bitcoinAddress: paymentRequest.bitcoinAddress,
                        amountUSD: paymentRequest.amountUSD,
                        amountBTC: paymentRequest.amountBTC,
                        exchangeRate: paymentRequest.exchangeRate,
                        planName: paymentRequest.planName,
                        instructions: paymentRequest.instructions,
                        message: paymentRequest.message,
                    },
                });
            }
            else {
                // Default to Cash App
                paymentRequest = await cashAppService_1.default.createPaymentRequest(userId, planId, amount, plan.name);
                res.status(200).json({
                    success: true,
                    data: {
                        paymentId: paymentRequest.paymentId,
                        paymentReference: paymentRequest.paymentReference,
                        paymentMethod: 'cashapp',
                        cashAppTag: paymentRequest.cashAppTag,
                        amount: paymentRequest.amount,
                        planName: paymentRequest.planName,
                        instructions: paymentRequest.instructions,
                        message: `Send payment to ${paymentRequest.cashAppTag} and provide the payment reference: ${paymentRequest.paymentReference}`,
                    },
                });
            }
        }
        catch (error) {
            const err = error;
            res.status(500).json({
                success: false,
                message: err.message,
            });
        }
    }
    /**
     * Verify payment (Cash App or Bitcoin) and create investment
     */
    async confirmInvestment(req, res) {
        try {
            const { paymentId, planId, cashAppTransactionId, bitcoinTransactionHash } = req.body;
            if (!paymentId) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required field: paymentId',
                });
                return;
            }
            // Get payment record
            const payment = await Payment_1.default.findById(paymentId).populate('investmentId');
            if (!payment) {
                res.status(404).json({
                    success: false,
                    message: 'Payment not found',
                });
                return;
            }
            if (payment.status !== 'pending') {
                res.status(400).json({
                    success: false,
                    message: 'Payment has already been processed',
                });
                return;
            }
            // Validate based on payment method
            if (payment.paymentMethod === 'cashapp' && !cashAppTransactionId) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required field for Cash App payment: cashAppTransactionId',
                });
                return;
            }
            if (payment.paymentMethod === 'bitcoin' && !bitcoinTransactionHash) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required field for Bitcoin payment: bitcoinTransactionHash',
                });
                return;
            }
            // Extract investment details from payment
            const userId = payment.userId;
            const finalPlanId = planId || payment.investmentId?.planId;
            if (!finalPlanId) {
                res.status(400).json({
                    success: false,
                    message: 'Plan ID is required',
                });
                return;
            }
            // Verify plan exists
            const plan = await investmentService_1.default.getPlanById(finalPlanId);
            if (!plan) {
                res.status(404).json({
                    success: false,
                    message: 'Investment plan not found',
                });
                return;
            }
            // Create investment
            const investment = await investmentService_1.default.createInvestment(userId, finalPlanId, payment.amount, paymentId.toString());
            // Verify payment based on method
            if (payment.paymentMethod === 'bitcoin') {
                await bitcoinService_1.default.verifyPayment(paymentId, bitcoinTransactionHash, 1);
            }
            else {
                await cashAppService_1.default.verifyPayment(paymentId, cashAppTransactionId, 'Payment verified via transaction ID');
            }
            // Update payment record
            await Payment_1.default.findByIdAndUpdate(paymentId, {
                investmentId: investment._id,
            }, { new: true });
            // Get user and plan details for notification
            const user = await User_1.default.findById(userId);
            // Create in-app notification
            if (user) {
                await Notification_1.default.create({
                    userId,
                    type: 'payment_confirmed',
                    title: 'Investment Confirmed',
                    message: `Your investment of $${payment.amount} in ${plan.name} has been successfully confirmed.`,
                    data: {
                        investmentId: investment._id.toString(),
                        investmentAmount: payment.amount,
                        planName: plan.name,
                        paymentId: paymentId.toString(),
                    },
                });
                // Send confirmation email
                try {
                    const fullName = `${user.firstName} ${user.lastName}`;
                    const emailHtml = emailService_1.default.generateInvestmentConfirmationEmailHtml(fullName, plan.name, payment.amount, user.currency || 'USD');
                    await emailService_1.default.sendEmail({
                        to: user.email,
                        subject: `Investment Confirmed - Crown Ledger ${plan.name}`,
                        html: emailHtml,
                    });
                }
                catch (emailError) {
                    console.error('[INVESTMENT] Error sending confirmation email:', emailError);
                    // Continue even if email fails
                }
            }
            res.status(201).json({
                success: true,
                message: 'Investment created successfully after payment verification',
                data: {
                    investment,
                    payment: {
                        paymentId: payment._id,
                        amount: payment.amount,
                        status: 'completed',
                    },
                },
            });
        }
        catch (error) {
            const err = error;
            res.status(500).json({
                success: false,
                message: err.message,
            });
        }
    }
    /**
     * Get user's investments
     */
    async getUserInvestments(req, res) {
        try {
            const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
            if (!userId) {
                res.status(400).json({
                    success: false,
                    message: 'User ID is required',
                });
                return;
            }
            const investments = await investmentService_1.default.getUserInvestments(userId);
            res.status(200).json({
                success: true,
                data: investments,
            });
        }
        catch (error) {
            const err = error;
            res.status(500).json({
                success: false,
                message: err.message,
            });
        }
    }
    /**
     * Get single investment
     */
    async getInvestment(req, res) {
        try {
            const investmentId = Array.isArray(req.params.investmentId) ? req.params.investmentId[0] : req.params.investmentId;
            const investment = await investmentService_1.default.getInvestmentById(investmentId);
            if (!investment) {
                res.status(404).json({
                    success: false,
                    message: 'Investment not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: investment,
            });
        }
        catch (error) {
            const err = error;
            res.status(500).json({
                success: false,
                message: err.message,
            });
        }
    }
    /**
     * Get portfolio summary
     */
    async getPortfolioSummary(req, res) {
        try {
            const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
            if (!userId) {
                res.status(400).json({
                    success: false,
                    message: 'User ID is required',
                });
                return;
            }
            const summary = await investmentService_1.default.getPortfolioSummary(userId);
            res.status(200).json({
                success: true,
                data: summary,
            });
        }
        catch (error) {
            const err = error;
            res.status(500).json({
                success: false,
                message: err.message,
            });
        }
    }
    /**
     * Get portfolio performance data
     */
    async getPortfolioPerformance(req, res) {
        try {
            const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
            if (!userId) {
                res.status(400).json({
                    success: false,
                    message: 'User ID is required',
                });
                return;
            }
            const performance = await investmentService_1.default.getPortfolioPerformance(userId);
            res.status(200).json({
                success: true,
                data: performance,
            });
        }
        catch (error) {
            const err = error;
            res.status(500).json({
                success: false,
                message: err.message,
            });
        }
    }
    /**
     * Get asset allocation
     */
    async getAssetAllocation(req, res) {
        try {
            const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
            if (!userId) {
                res.status(400).json({
                    success: false,
                    message: 'User ID is required',
                });
                return;
            }
            const allocation = await investmentService_1.default.getAssetAllocation(userId);
            res.status(200).json({
                success: true,
                data: allocation,
            });
        }
        catch (error) {
            const err = error;
            res.status(500).json({
                success: false,
                message: err.message,
            });
        }
    }
    /**
     * Cancel investment
     */
    async cancelInvestment(req, res) {
        try {
            const investmentId = Array.isArray(req.params.investmentId) ? req.params.investmentId[0] : req.params.investmentId;
            const investment = await investmentService_1.default.cancelInvestment(investmentId);
            if (!investment) {
                res.status(404).json({
                    success: false,
                    message: 'Investment not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Investment cancelled successfully',
                data: investment,
            });
        }
        catch (error) {
            const err = error;
            res.status(500).json({
                success: false,
                message: err.message,
            });
        }
    }
}
exports.InvestmentController = InvestmentController;
exports.default = new InvestmentController();
