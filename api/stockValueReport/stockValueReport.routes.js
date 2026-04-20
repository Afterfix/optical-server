const express = require("express");
const router = express.Router();
const validateToken = require("../../../apps/gadgetx/middlewares/validateToken");

const StockValueReportService = require("./stockValueReport.service");
const StockValueReportController = require("./stockValueReport.controller");

const service = new StockValueReportService();
const controller = new StockValueReportController(service);

router.use(validateToken);

router.get("/paginated", controller.getPaginatedSummary.bind(controller));

router.get("/", controller.getSummary.bind(controller));

module.exports = router;
