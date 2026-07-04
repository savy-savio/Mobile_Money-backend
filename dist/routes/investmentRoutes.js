"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const investmentController_1 = __importDefault(require("../controllers/investmentController"));
const router = express_1.default.Router();
/**
 * Investment Plans
 */
router.get('/plans', investmentController_1.default.getAllPlans.bind(investmentController_1.default));
router.get('/plans/:planId', investmentController_1.default.getPlanById.bind(investmentController_1.default));
/**
 * Investments
 */
router.get('/:userId/investments', investmentController_1.default.getUserInvestments.bind(investmentController_1.default));
router.get('/investment/:investmentId', investmentController_1.default.getInvestment.bind(investmentController_1.default));
router.post('/:investmentId/cancel', investmentController_1.default.cancelInvestment.bind(investmentController_1.default));
/**
 * Dashboard & Portfolio
 */
router.get('/:userId/portfolio/summary', investmentController_1.default.getPortfolioSummary.bind(investmentController_1.default));
router.get('/:userId/portfolio/performance', investmentController_1.default.getPortfolioPerformance.bind(investmentController_1.default));
router.get('/:userId/portfolio/allocation', investmentController_1.default.getAssetAllocation.bind(investmentController_1.default));
/**
 * Payment
 */
router.post('/payment/initialize', investmentController_1.default.initializePayment.bind(investmentController_1.default));
router.post('/payment/confirm', investmentController_1.default.confirmInvestment.bind(investmentController_1.default));
exports.default = router;
