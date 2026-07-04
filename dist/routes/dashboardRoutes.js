"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dashboardController_1 = __importDefault(require("../controllers/dashboardController"));
// import dashboardController from "../"
const router = express_1.default.Router();
/**
 * Dashboard endpoints
 * Note: Specific routes must come BEFORE generic :userId routes
 */
// Specific investment routes (must be first)
router.get('/investment/:investmentId/details', dashboardController_1.default.getInvestmentDetails.bind(dashboardController_1.default));
// Generic userId routes (must be after specific routes)
router.get('/:userId/overview', dashboardController_1.default.getDashboardData.bind(dashboardController_1.default));
router.get('/:userId/stats', dashboardController_1.default.getPortfolioStats.bind(dashboardController_1.default));
router.get('/:userId/trends', dashboardController_1.default.getPerformanceTrends.bind(dashboardController_1.default));
router.get('/:userId/compare', dashboardController_1.default.compareInvestments.bind(dashboardController_1.default));
router.get('/:userId/allocation', dashboardController_1.default.getAllocationBreakdown.bind(dashboardController_1.default));
exports.default = router;
