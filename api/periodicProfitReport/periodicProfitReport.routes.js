const express = require("express");
const router = express.Router();
const validateToken = require("../../../apps/gadgetx/middlewares/validateToken");

const PeriodicProfitReportService = require("./periodicProfitReport.service");
const PeriodicProfitReportController = require("./periodicProfitReport.controller");

// Instantiate stateless service
const service = new PeriodicProfitReportService();
const controller = new PeriodicProfitReportController(service);

router.get("/", validateToken, controller.getSummary.bind(controller));

module.exports = router;
