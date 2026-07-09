"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvestmentService = void 0;
const InvestmentPlan_1 = __importDefault(require("../models/InvestmentPlan"));
const UserInvestment_1 = __importDefault(require("../models/UserInvestment"));
const savingsService_1 = __importDefault(require("./savingsService"));
const mongoose_1 = __importDefault(require("mongoose"));
class InvestmentService {
    /**
     * Get all active investment plans
     */
    async getAllPlans() {
        return await InvestmentPlan_1.default.find({ status: 'active' }).exec();
    }
    /**
     * Get a specific investment plan
     */
    async getPlanById(planId) {
        if (!mongoose_1.default.Types.ObjectId.isValid(planId)) {
            return null;
        }
        return await InvestmentPlan_1.default.findById(planId).exec();
    }
    /**
     * Create a new investment for a user
     */
    async createInvestment(userId, planId, amount, stripePaymentId) {
        const plan = await this.getPlanById(planId);
        if (!plan) {
            throw new Error('Investment plan not found');
        }
        if (amount < plan.minInvestment) {
            throw new Error(`Minimum investment is $${plan.minInvestment}`);
        }
        const investmentDate = new Date();
        const maturityDate = new Date(investmentDate);
        maturityDate.setMonth(maturityDate.getMonth() + plan.duration);
        // Calculate initial monthly performance
        const monthlyPerformance = [];
        const monthlyReturnRate = plan.expectedReturn / plan.duration / 100;
        for (let i = 0; i < plan.duration; i++) {
            const perfDate = new Date(investmentDate);
            perfDate.setMonth(perfDate.getMonth() + i);
            const currentValue = amount * Math.pow(1 + monthlyReturnRate, i + 1);
            const monthlyReturn = currentValue - amount;
            monthlyPerformance.push({
                month: perfDate.getMonth() + 1,
                year: perfDate.getFullYear(),
                value: Math.round(currentValue * 100) / 100,
                return: Math.round(monthlyReturn * 100) / 100,
            });
        }
        const finalValue = monthlyPerformance.length > 0 ? monthlyPerformance[monthlyPerformance.length - 1].value : amount;
        const totalGain = finalValue - amount;
        const gainPercentage = (totalGain / amount) * 100;
        const investment = new UserInvestment_1.default({
            userId,
            planId: new mongoose_1.default.Types.ObjectId(planId),
            planName: plan.name,
            amountInvested: amount,
            currentValue: amount, // Start with invested amount
            gain: 0,
            totalGain,
            gainPercentage,
            monthlyPerformance,
            investmentDate,
            maturityDate,
            status: 'active',
            stripePaymentId,
        });
        await investment.save();
        // Ensure user has savings account
        await savingsService_1.default.createSavingsAccount(userId);
        console.log(`[INVESTMENT] Created investment of $${amount} for user ${userId}`);
        return investment;
    }
    /**
     * Get all investments for a user
     */
    async getUserInvestments(userId) {
        return await UserInvestment_1.default.find({ userId }).exec();
    }
    /**
     * Get single investment
     */
    async getInvestmentById(investmentId) {
        if (!mongoose_1.default.Types.ObjectId.isValid(investmentId)) {
            return null;
        }
        return await UserInvestment_1.default.findById(investmentId).exec();
    }
    /**
     * Get portfolio summary for dashboard
     */
    async getPortfolioSummary(userId) {
        const investments = await UserInvestment_1.default.find({ userId, status: 'active' }).exec();
        const totalInvested = investments.reduce((sum, inv) => sum + inv.amountInvested, 0);
        const portfolioValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
        const totalGains = portfolioValue - totalInvested;
        const avgReturn = investments.length > 0
            ? (investments.reduce((sum, inv) => sum + inv.gainPercentage, 0) / investments.length)
            : 0;
        return {
            totalInvested: Math.round(totalInvested * 100) / 100,
            activePlans: investments.length,
            portfolioValue: Math.round(portfolioValue * 100) / 100,
            totalGains: Math.round(totalGains * 100) / 100,
            avgReturn: Math.round(avgReturn * 10) / 10,
            lastUpdated: new Date(),
        };
    }
    /**
     * Get portfolio performance data (monthly growth)
     */
    async getPortfolioPerformance(userId) {
        const investments = await UserInvestment_1.default.find({ userId, status: 'active' }).exec();
        // Create a map to aggregate monthly values
        const performanceMap = new Map();
        investments.forEach((investment) => {
            investment.monthlyPerformance.forEach((perf) => {
                const key = `${perf.year}-${String(perf.month).padStart(2, '0')}`;
                const currentValue = performanceMap.get(key) || 0;
                performanceMap.set(key, currentValue + perf.value);
            });
        });
        // Convert to sorted array for January to December view
        const performanceData = Array.from(performanceMap.entries())
            .map(([key, value]) => {
            const [year, month] = key.split('-');
            return {
                month: parseInt(month),
                year: parseInt(year),
                value: Math.round(value * 100) / 100,
            };
        })
            .sort((a, b) => {
            if (a.year === b.year)
                return a.month - b.month;
            return a.year - b.year;
        });
        return performanceData;
    }
    /**
     * Get asset allocation across all user investments
     */
    async getAssetAllocation(userId) {
        const investments = await UserInvestment_1.default.find({ userId, status: 'active' }).populate('planId').exec();
        let totalEquities = 0;
        let totalRealEstate = 0;
        let totalAgriculture = 0;
        let totalBonds = 0;
        let totalInvested = 0;
        investments.forEach((investment) => {
            const plan = investment.planId;
            if (plan && plan.assetAllocation) {
                const allocation = plan.assetAllocation;
                const allocationAmount = investment.amountInvested;
                totalEquities += (allocation.equities / 100) * allocationAmount;
                totalRealEstate += (allocation.realEstate / 100) * allocationAmount;
                totalAgriculture += (allocation.agriculture / 100) * allocationAmount;
                totalBonds += (allocation.bonds / 100) * allocationAmount;
                totalInvested += allocationAmount;
            }
        });
        return {
            equities: totalInvested > 0 ? Math.round((totalEquities / totalInvested) * 100) : 0,
            realEstate: totalInvested > 0 ? Math.round((totalRealEstate / totalInvested) * 100) : 0,
            agriculture: totalInvested > 0 ? Math.round((totalAgriculture / totalInvested) * 100) : 0,
            bonds: totalInvested > 0 ? Math.round((totalBonds / totalInvested) * 100) : 0,
        };
    }
    /**
     * Update investment status
     */
    async updateInvestmentStatus(investmentId, status) {
        if (!mongoose_1.default.Types.ObjectId.isValid(investmentId)) {
            return null;
        }
        return await UserInvestment_1.default.findByIdAndUpdate(investmentId, { status }, { new: true }).exec();
    }
    /**
     * Cancel investment
     */
    async cancelInvestment(investmentId) {
        return this.updateInvestmentStatus(investmentId, 'cancelled');
    }
    /**
     * Seed initial investment plans
     */
    async seedInvestmentPlans() {
        const existingPlans = await InvestmentPlan_1.default.countDocuments();
        if (existingPlans > 0) {
            return; // Already seeded
        }
        const plans = [
            {
                name: 'Premium Plan',
                description: 'Balanced investment portfolio with moderate risk',
                minInvestment: 5000,
                duration: 12,
                riskLevel: 'Medium',
                expectedReturn: 15,
                assetAllocation: {
                    equities: 42,
                    realEstate: 28,
                    agriculture: 18,
                    bonds: 12,
                },
            },
            {
                name: 'Exclusive Plan',
                description: 'High-growth investment strategy',
                minInvestment: 10000,
                duration: 24,
                riskLevel: 'High',
                expectedReturn: 25,
                assetAllocation: {
                    equities: 50,
                    realEstate: 25,
                    agriculture: 20,
                    bonds: 5,
                },
            },
            {
                name: 'Supreme Plan',
                description: 'Premium long-term wealth building',
                minInvestment: 25000,
                duration: 36,
                riskLevel: 'High',
                expectedReturn: 30,
                assetAllocation: {
                    equities: 55,
                    realEstate: 30,
                    agriculture: 10,
                    bonds: 5,
                },
            },
            {
                name: 'Real Estate Plan',
                description: 'Focus on real estate investment opportunities',
                minInvestment: 15000,
                duration: 24,
                riskLevel: 'Medium',
                expectedReturn: 20,
                assetAllocation: {
                    equities: 15,
                    realEstate: 70,
                    agriculture: 10,
                    bonds: 5,
                },
            },
            {
                name: 'Agricultural Plan',
                description: 'Invest in agricultural and farming ventures',
                minInvestment: 8000,
                duration: 18,
                riskLevel: 'Low',
                expectedReturn: 18,
                assetAllocation: {
                    equities: 10,
                    realEstate: 15,
                    agriculture: 70,
                    bonds: 5,
                },
            },
        ];
        await InvestmentPlan_1.default.insertMany(plans);
    }
}
exports.InvestmentService = InvestmentService;
exports.default = new InvestmentService();
