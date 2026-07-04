import express from 'express';
import dashboardController from '../controllers/dashboardController';
// import dashboardController from "../"

const router = express.Router();

/**
 * Dashboard endpoints
 * Note: Specific routes must come BEFORE generic :userId routes
 */

// Specific investment routes (must be first)
router.get('/investment/:investmentId/details', dashboardController.getInvestmentDetails.bind(dashboardController));

// Generic userId routes (must be after specific routes)
router.get('/:userId/overview', dashboardController.getDashboardData.bind(dashboardController));
router.get('/:userId/stats', dashboardController.getPortfolioStats.bind(dashboardController));
router.get('/:userId/trends', dashboardController.getPerformanceTrends.bind(dashboardController));
router.get('/:userId/compare', dashboardController.compareInvestments.bind(dashboardController));
router.get('/:userId/allocation', dashboardController.getAllocationBreakdown.bind(dashboardController));

export default router;
