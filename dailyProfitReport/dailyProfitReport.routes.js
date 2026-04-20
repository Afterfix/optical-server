const express = require("express");
const router = express.Router();
const validateToken = require("../../../apps/gadgetx/middlewares/validateToken");

const DailyProfitReportService = require("./dailyProfitReport.service");
const DailyProfitReportController = require("./dailyProfitReport.controller");

// Instantiate stateless service
const service = new DailyProfitReportService();
const controller = new DailyProfitReportController(service);

router.get("/", validateToken, controller.getSummary.bind(controller));

module.exports = router;
