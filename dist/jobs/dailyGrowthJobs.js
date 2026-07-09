"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const UserInvestment_1 = __importDefault(require("../models/UserInvestment"));
const InvestmentGrowth_1 = __importDefault(require("../models/InvestmentGrowth"));
const InvestmentPlan_1 = __importDefault(require("../models/InvestmentPlan"));
const savingsService_1 = __importDefault(require("../services/savingsService"));
class DailyGrowthJob {
    /**
     * Start the daily growth job
     * Runs every day at 2:00 AM
     */
    static start() {
        // Schedule job to run daily at 2:00 AM (02:00)
        node_cron_1.default.schedule('0 2 * * *', async () => {
            console.log('[DAILY-GROWTH-JOB] Starting daily growth calculation...');
            try {
                await this.calculateDailyGrowth();
                console.log('[DAILY-GROWTH-JOB] Daily growth calculation completed successfully');
            }
            catch (error) {
                console.error('[DAILY-GROWTH-JOB] Error in daily growth job:', error);
            }
        });
        console.log('[DAILY-GROWTH-JOB] Daily growth job scheduled to run at 2:00 AM daily');
    }
    /**
     * Calculate daily growth for all active investments
     */
    static async calculateDailyGrowth() {
        try {
            // Get all active investments
            const activeInvestments = await UserInvestment_1.default.find({ status: 'active' });
            if (activeInvestments.length === 0) {
                console.log('[DAILY-GROWTH-JOB] No active investments found');
                return;
            }
            console.log(`[DAILY-GROWTH-JOB] Processing ${activeInvestments.length} active investments...`);
            for (const investment of activeInvestments) {
                await this.processInvestmentGrowth(investment);
            }
            // Apply daily interest to all savings accounts
            const totalInterest = await savingsService_1.default.calculateAllUserInterest();
            console.log(`[DAILY-GROWTH-JOB] Applied daily interest to savings accounts: $${totalInterest.toFixed(2)}`);
        }
        catch (error) {
            console.error('[DAILY-GROWTH-JOB] Error calculating daily growth:', error);
            throw error;
        }
    }
    /**
     * Process growth for a single investment
     */
    static async processInvestmentGrowth(investment) {
        try {
            // Get the investment plan details
            const plan = await InvestmentPlan_1.default.findById(investment.planId);
            if (!plan) {
                console.log(`[DAILY-GROWTH-JOB] Plan not found for investment ${investment._id}`);
                return;
            }
            // Calculate daily growth rate based on plan's expected annual return
            // dailyGrowthRate = (expectedReturn / 365) / 100
            const dailyGrowthRate = (plan.expectedReturn / 365) / 100;
            const previousValue = investment.currentValue;
            const dailyGain = previousValue * dailyGrowthRate;
            const newValue = previousValue + dailyGain;
            // Calculate cumulative gain
            const initialAmount = investment.amountInvested;
            const cumulativeGain = newValue - initialAmount;
            const cumulativeGainPercentage = (cumulativeGain / initialAmount) * 100;
            // Calculate days invested
            const startDate = new Date(investment.createdAt);
            const today = new Date();
            const dayNumber = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            // Create growth record
            const growthRecord = new InvestmentGrowth_1.default({
                investmentId: investment._id,
                userId: investment.userId,
                planId: investment.planId,
                date: new Date(),
                dayNumber,
                growthPercentage: dailyGrowthRate,
                previousValue,
                newValue,
                dailyGain,
                cumulativeGain,
                cumulativeGainPercentage,
            });
            await growthRecord.save();
            // Update investment with new value
            investment.currentValue = newValue;
            investment.gain = cumulativeGain;
            investment.gainPercentage = cumulativeGainPercentage;
            investment.lastGrowthUpdate = new Date();
            await investment.save();
            console.log(`[DAILY-GROWTH-JOB] Investment ${investment._id}: ${previousValue.toFixed(2)} → ${newValue.toFixed(2)} (+$${dailyGain.toFixed(2)})`);
        }
        catch (error) {
            console.error(`[DAILY-GROWTH-JOB] Error processing investment ${investment._id}:`, error);
            // Continue with next investment instead of throwing
        }
    }
    /**
     * Manually trigger daily growth calculation (for testing)
     */
    static async trigger() {
        console.log('[DAILY-GROWTH-JOB] Manually triggered daily growth calculation');
        await this.calculateDailyGrowth();
    }
}
exports.default = DailyGrowthJob;
