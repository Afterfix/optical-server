// src/hooks/api/ledger/ledger.routes.js
const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");
const LedgerRepository = require("./ledger.repository");
const LedgerService = require("./ledger.service");
const LedgerController = require("./ledger.controller");
const LedgerValidator = require("./ledger.validator");

// Initialize without db injection
const ledgerRepository = new LedgerRepository();
const ledgerService = new LedgerService(ledgerRepository);
const ledgerController = new LedgerController(ledgerService);
const ledgerValidator = new LedgerValidator();

router.use(validateToken);

// Reports - Must be defined before /:id
router.get("/report", ledgerController.getReport.bind(ledgerController));
router.get(
  "/report/monthly",
  ledgerController.getMonthlyReport.bind(ledgerController),
);

router.get(
  "/paginated",
  ledgerController.getAllPaginated.bind(ledgerController),
);

router
  .route("/")
  .get(ledgerController.getAll.bind(ledgerController))
  .post(
    ledgerValidator.createValidator.bind(ledgerValidator),
    ledgerController.create.bind(ledgerController),
  );

router
  .route("/:id")
  .get(ledgerController.getById.bind(ledgerController))
  .put(
    ledgerValidator.updateValidator.bind(ledgerValidator),
    ledgerController.update.bind(ledgerController),
  )
  .delete(ledgerController.delete.bind(ledgerController));

module.exports = router;
