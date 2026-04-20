// api/doneBySummary/doneBySummary.routes.js
const express = require('express');
const router = express.Router();
const validateToken = require('../../../apps/gadgetx/middlewares/validateToken');

const DoneBySummaryService = require('./doneBySummary.service');
const DoneBySummaryController = require('./doneBySummary.controller');

// No repository needed for this summary view
// Initialize without db injection
const service = new DoneBySummaryService();
const controller = new DoneBySummaryController(service);

router.get('/', validateToken, controller.getSummary.bind(controller));

module.exports = router;