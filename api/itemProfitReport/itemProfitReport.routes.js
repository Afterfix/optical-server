const express = require("express");
const router = express.Router();
const validateToken = require("../../../apps/gadgetx/middlewares/validateToken");

const ItemProfitReportService = require("./itemProfitReport.service");
const ItemProfitReportController = require("./itemProfitReport.controller");

// No repository - inject db directly into service
const service = new ItemProfitReportService();
const controller = new ItemProfitReportController(service);

router.get("/", validateToken, controller.getSummary.bind(controller));

module.exports = router;
