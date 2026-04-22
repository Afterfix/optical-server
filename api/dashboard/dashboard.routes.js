const express = require("express");
const router = express.Router();
const DashboardController = require("./dashboard.controller");
const validateToken = require("../../middlewares/validateToken");

const controller = new DashboardController();

router.use(validateToken);

router.get("/financial-summary", (req, res, next) => controller.getFinancialSummary(req, res, next));
router.get("/weekly-sales-purchases", (req, res, next) => controller.getWeeklySalesPurchases(req, res, next));
router.get("/top-selling-products", (req, res, next) => controller.getTopSellingProducts(req, res, next));
router.get("/stock-alerts", (req, res, next) => controller.getStockAlerts(req, res, next));
router.get("/recent-sales", (req, res, next) => controller.getRecentSales(req, res, next));
router.get("/recent-purchases", (req, res, next) => controller.getRecentPurchases(req, res, next));

module.exports = router;
