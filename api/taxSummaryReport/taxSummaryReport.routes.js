const express = require("express");
const router = express.Router();
const validateToken = require("../../../apps/gadgetx/middlewares/validateToken");

const TaxSummaryReportService = require("./taxSummaryReport.service");
const TaxSummaryReportController = require("./taxSummaryReport.controller");

const service = new TaxSummaryReportService();
const controller = new TaxSummaryReportController(service);

router.get("/", validateToken, controller.getSummary.bind(controller));

module.exports = router;
