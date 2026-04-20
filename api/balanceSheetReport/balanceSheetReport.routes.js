const express = require('express');
const router = express.Router();
const validateToken = require('../../../apps/gadgetx/middlewares/validateToken');

const BalanceSheetReportService = require('./balanceSheetReport.service');
const BalanceSheetReportController = require('./balanceSheetReport.controller');

// Instantiate stateless service
const service = new BalanceSheetReportService();
const controller = new BalanceSheetReportController(service);

router.get('/', validateToken, controller.getSummary.bind(controller));

module.exports = router;