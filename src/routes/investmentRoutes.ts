import express from 'express';
import investmentController from '../controllers/investmentController';

const router = express.Router();

/**
 * Investment Plans
 */
router.get('/plans', investmentController.getAllPlans.bind(investmentController));
router.get('/plans/:planId', investmentController.getPlanById.bind(investmentController));

/**
 * Investments
 */
router.get('/:userId/investments', investmentController.getUserInvestments.bind(investmentController));
router.get('/investment/:investmentId', investmentController.getInvestment.bind(investmentController));
router.post('/:investmentId/cancel', investmentController.cancelInvestment.bind(investmentController));

/**
 * Dashboard & Portfolio
 */
router.get('/:userId/portfolio/summary', investmentController.getPortfolioSummary.bind(investmentController));
router.get('/:userId/portfolio/performance', investmentController.getPortfolioPerformance.bind(investmentController));
router.get('/:userId/portfolio/allocation', investmentController.getAssetAllocation.bind(investmentController));

/**
 * Payment
 */
router.post('/payment/initialize', investmentController.initializePayment.bind(investmentController));
router.post('/payment/confirm', investmentController.confirmInvestment.bind(investmentController));

export default router;
