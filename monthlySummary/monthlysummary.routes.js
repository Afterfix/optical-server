// --- START OF FILE api/monthly-summary/monthly-summary.routes.js ---

const express = require('express');
const router = express.Router();
const validateToken = require('../../../apps/gadgetx/middlewares/validateToken');
const db = require('../../../apps/gadgetx/config/db');

// Import monthly summary components
const MonthlySummaryRepository = require('./monthlysummary.repository');
const MonthlySummaryService = require('./monthlysummary.service');
const MonthlySummaryController = require('./monthlysummary.controller');

// Initialize components
const monthlySummaryRepository = new MonthlySummaryRepository(db);
const monthlySummaryService = new MonthlySummaryService(monthlySummaryRepository);
const monthlySummaryController = new MonthlySummaryController(monthlySummaryService);

// Define the route for this module
router.get('/', validateToken, monthlySummaryController.getSummary.bind(monthlySummaryController));

module.exports = router;