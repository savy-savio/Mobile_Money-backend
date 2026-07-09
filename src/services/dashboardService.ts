import UserInvestment from '../models/UserInvestment';
import savingsService from './savingsService';
import InvestmentGrowth from '../models/InvestmentGrowth';

class DashboardService {
  /**
   * Get total balance (investments + savings)
   */
  async getTotalBalance(userId: string): Promise<number> {
    const investmentsBalance = await this.getInvestmentsBalance(userId);
    const savingsBalance = await this.getSavingsBalance(userId);
    return investmentsBalance + savingsBalance;
  }

  /**
   * Get total investments balance
   */
  async getInvestmentsBalance(userId: string): Promise<number> {
    try {
      const investments = await UserInvestment.find({
        userId,
        status: 'active',
      });

      const totalBalance = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
      return totalBalance;
    } catch (error) {
      console.error('[DASHBOARD] Error getting investments balance:', error);
      return 0;
    }
  }

  /**
   * Get total savings balance
   */
  async getSavingsBalance(userId: string): Promise<number> {
    try {
      const savingsDetails = await savingsService.getSavingsSummary(userId);
      return savingsDetails.balance;
    } catch (error) {
      console.error('[DASHBOARD] Error getting savings balance:', error);
      return 0;
    }
  }

  /**
   * Get daily growth summary
   */
  async getDailyGrowthSummary(userId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all growth records for today
      const todayGrowth = await InvestmentGrowth.find({
        userId,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      });

      const totalDailyGain = todayGrowth.reduce((sum, g) => sum + g.dailyGain, 0);
      const investmentsBalance = await this.getInvestmentsBalance(userId);
      const dailyGrowthPercentage = investmentsBalance > 0 ? (totalDailyGain / investmentsBalance) * 100 : 0;

      return {
        totalDailyGain,
        dailyGrowthPercentage,
        growthRecords: todayGrowth.length,
      };
    } catch (error) {
      console.error('[DASHBOARD] Error getting daily growth summary:', error);
      return {
        totalDailyGain: 0,
        dailyGrowthPercentage: 0,
        growthRecords: 0,
      };
    }
  }

  /**
   * Get complete dashboard summary
   */
  async getDashboardSummary(userId: string) {
    try {
      const totalBalance = await this.getTotalBalance(userId);
      const investmentsBalance = await this.getInvestmentsBalance(userId);
      const savingsBalance = await this.getSavingsBalance(userId);
      const dailyGrowth = await this.getDailyGrowthSummary(userId);
      const savingsSummary = await savingsService.getSavingsSummary(userId);

      const investments = await UserInvestment.find({
        userId,
        status: 'active',
      });

      const totalInvested = investments.reduce((sum, inv) => sum + (inv.amountInvested || 0), 0);
      const totalGain = investmentsBalance - totalInvested;
      const investmentGainPercentage = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

      return {
        balances: {
          totalBalance,
          investmentsBalance,
          savingsBalance,
        },
        investments: {
          totalInvested,
          currentValue: investmentsBalance,
          totalGain,
          gainPercentage: investmentGainPercentage,
          count: investments.length,
        },
        savings: {
          balance: savingsSummary.balance,
          monthlyInterest: savingsSummary.monthlyInterest,
          apy: savingsSummary.apy,
          totalInterestEarned: savingsSummary.totalInterestEarned,
        },
        dailyGrowth: {
          totalDailyGain: dailyGrowth.totalDailyGain,
          dailyGrowthPercentage: dailyGrowth.dailyGrowthPercentage,
        },
      };
    } catch (error) {
      console.error('[DASHBOARD] Error getting dashboard summary:', error);
      throw error;
    }
  }

  /**
   * Get growth history for specific investment
   */
  async getInvestmentGrowthHistory(investmentId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      return await InvestmentGrowth.find({
        investmentId,
        date: {
          $gte: startDate,
        },
      }).sort({ date: 1 });
    } catch (error) {
      console.error('[DASHBOARD] Error getting growth history:', error);
      return [];
    }
  }

  /**
   * Get latest growth records
   */
  async getLatestGrowthRecords(userId: string, limit: number = 10) {
    try {
      return await InvestmentGrowth.find({ userId })
        .sort({ date: -1 })
        .limit(limit);
    } catch (error) {
      console.error('[DASHBOARD] Error getting latest growth records:', error);
      return [];
    }
  }
}

export default new DashboardService();
