const express = require('express');
const router = express.Router();
const validateToken = require('../../../apps/gadgetx/middlewares/validateToken');

const CostCenterSummaryService = require('./costCenterSummary.service');
const CostCenterSummaryController = require('./costCenterSummary.controller');

// No db injection here
const service = new CostCenterSummaryService();
const controller = new CostCenterSummaryController(service);

router.get('/', validateToken, controller.getSummary.bind(controller));

module.exports = router;