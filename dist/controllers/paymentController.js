"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const cashAppService_1 = __importDefault(require("../services/cashAppService"));
const bitcoinService_1 = __importDefault(require("../services/bitcoinService"));
const Payment_1 = __importDefault(require("../models/Payment"));
class PaymentController {
    /**
     * Get payment status
     */
    async getPaymentStatus(req, res) {
        try {
            const paymentId = Array.isArray(req.params.paymentId)
                ? req.params.paymentId[0]
                : req.params.paymentId;
            if (!paymentId) {
                res.status(400).json({
                    success: false,
                    message: 'Payment ID is required',
                });
                return;
            }
            const payment = await cashAppService_1.default.getPaymentStatus(paymentId);
            res.status(200).json({
                success: true,
                data: payment,
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
     * Get payment by reference
     */
    async getPaymentByReference(req, res) {
        try {
            const paymentReference = Array.isArray(req.params.paymentReference)
                ? req.params.paymentReference[0]
                : req.params.paymentReference;
            if (!paymentReference) {
                res.status(400).json({
                    success: false,
                    message: 'Payment reference is required',
                });
                return;
            }
            const payment = await cashAppService_1.default.getPaymentByReference(paymentReference);
            res.status(200).json({
                success: true,
                data: payment,
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
     * Verify Cash App payment
     */
    async verifyPayment(req, res) {
        try {
            const { paymentId, cashAppTransactionId, verificationNotes } = req.body;
            if (!paymentId || !cashAppTransactionId) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: paymentId, cashAppTransactionId',
                });
                return;
            }
            const payment = await cashAppService_1.default.verifyPayment(paymentId, cashAppTransactionId, verificationNotes);
            res.status(200).json({
                success: true,
                message: 'Payment verified successfully',
                data: payment,
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
     * Cancel payment
     */
    async cancelPayment(req, res) {
        try {
            const paymentId = Array.isArray(req.params.paymentId)
                ? req.params.paymentId[0]
                : req.params.paymentId;
            const { reason } = req.body;
            if (!paymentId) {
                res.status(400).json({
                    success: false,
                    message: 'Payment ID is required',
                });
                return;
            }
            const payment = await cashAppService_1.default.cancelPayment(paymentId, reason);
            res.status(200).json({
                success: true,
                message: 'Payment cancelled successfully',
                data: payment,
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
     * Get user's payment history
     */
    async getUserPaymentHistory(req, res) {
        try {
            const userId = Array.isArray(req.params.userId)
                ? req.params.userId[0]
                : req.params.userId;
            const { limit = 50, skip = 0 } = req.query;
            if (!userId) {
                res.status(400).json({
                    success: false,
                    message: 'User ID is required',
                });
                return;
            }
            const history = await cashAppService_1.default.getUserPaymentHistory(userId, parseInt(limit), parseInt(skip));
            res.status(200).json({
                success: true,
                data: history,
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
     * Resend payment instructions
     */
    async resendPaymentInstructions(req, res) {
        try {
            const paymentId = Array.isArray(req.params.paymentId)
                ? req.params.paymentId[0]
                : req.params.paymentId;
            if (!paymentId) {
                res.status(400).json({
                    success: false,
                    message: 'Payment ID is required',
                });
                return;
            }
            const instructions = await cashAppService_1.default.resendPaymentInstructions(paymentId);
            res.status(200).json({
                success: true,
                data: instructions,
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
     * Verify Bitcoin payment with transaction hash
     */
    async verifyBitcoinPayment(req, res) {
        try {
            const { paymentId, bitcoinTransactionHash, confirmations = 1 } = req.body;
            if (!paymentId || !bitcoinTransactionHash) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: paymentId, bitcoinTransactionHash',
                });
                return;
            }
            // Verify payment
            await bitcoinService_1.default.verifyPayment(paymentId, bitcoinTransactionHash, confirmations);
            const payment = await Payment_1.default.findById(paymentId);
            res.status(200).json({
                success: true,
                message: 'Bitcoin payment verified successfully',
                data: {
                    paymentId: payment?._id,
                    status: payment?.status,
                    transactionHash: bitcoinTransactionHash,
                    confirmations,
                    verifiedAt: payment?.verifiedAt,
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
     * Get Bitcoin payment details
     */
    async getBitcoinPaymentDetails(req, res) {
        try {
            const paymentId = Array.isArray(req.params.paymentId)
                ? req.params.paymentId[0]
                : req.params.paymentId;
            if (!paymentId) {
                res.status(400).json({
                    success: false,
                    message: 'Payment ID is required',
                });
                return;
            }
            const paymentDetails = await bitcoinService_1.default.getPaymentDetails(paymentId);
            res.status(200).json({
                success: true,
                data: paymentDetails,
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
     * Get Bitcoin address for payment
     */
    async getBitcoinAddress(req, res) {
        try {
            const paymentId = Array.isArray(req.params.paymentId)
                ? req.params.paymentId[0]
                : req.params.paymentId;
            if (!paymentId) {
                res.status(400).json({
                    success: false,
                    message: 'Payment ID is required',
                });
                return;
            }
            const payment = await Payment_1.default.findById(paymentId);
            if (!payment) {
                res.status(404).json({
                    success: false,
                    message: 'Payment not found',
                });
                return;
            }
            if (payment.paymentMethod !== 'bitcoin') {
                res.status(400).json({
                    success: false,
                    message: 'This payment is not a Bitcoin payment',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: {
                    bitcoinAddress: payment.bitcoinAddress,
                    amount: payment.bitcoinAmountBTC,
                    amountUSD: payment.bitcoinAmountUSD,
                    paymentReference: payment.paymentReference,
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
}
exports.PaymentController = PaymentController;
exports.default = new PaymentController();
