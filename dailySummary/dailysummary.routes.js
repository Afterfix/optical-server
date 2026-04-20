const express = require('express');
const router = express.Router();
const validateToken = require('../../../apps/gadgetx/middlewares/validateToken');
// REMOVED: const db = require('../../config/db');

const DailySummaryRepository = require('./dailysummary.repository');
const DailySummaryService = require('./dailysummary.service');
const DailySummaryController = require('./dailysummary.controller');

// Stateless initialization
const dailySummaryRepository = new DailySummaryRepository();
const dailySummaryService = new DailySummaryService(dailySummaryRepository);
const dailySummaryController = new DailySummaryController(dailySummaryService);

router.get('/', validateToken, dailySummaryController.getSummary.bind(dailySummaryController));

module.exports = router;