const express = require("express");
const router = express.Router();
const validateToken = require("../../../apps/gadgetx/middlewares/validateToken");

const PartySummaryService = require("./partySummary.service");
const PartySummaryController = require("./partySummary.controller");

const service = new PartySummaryService();
const controller = new PartySummaryController(service);

router.get("/", validateToken, controller.getSummary.bind(controller));
router.get(
  "/payments/:party_id",
  validateToken,
  controller.getPartyPaymentDetails.bind(controller)
);

module.exports = router;
