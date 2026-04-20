// api/stockDetailedReport/stockDetailedReport.routes.js
const express = require('express');
const router = express.Router();
const validateToken = require('../../../apps/gadgetx/middlewares/validateToken');
// const db = require('../../config/db'); // No longer needed

const StockDetailedReportService = require('./stockDetailedReport.service');
const StockDetailedReportController = require('./stockDetailedReport.controller');

// No repository - instantiate service without db
const service = new StockDetailedReportService();
const controller = new StockDetailedReportController(service);

router.get('/', validateToken, controller.getSummary.bind(controller));

module.exports = router;