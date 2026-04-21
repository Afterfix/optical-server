const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");

const TransactionRepository = require("./transaction.repository");
const TransactionService = require("./transaction.service");
const TransactionController = require("./transaction.controller");
const TransactionValidator = require("./transaction.validator");

const TransactionLedgerRepository = require("../transactionLedger/transactionLedger.repository");
const TransactionLedgerService = require("../transactionLedger/transactionLedger.service");

const transactionRepository = new TransactionRepository();
const transactionLedgerRepository = new TransactionLedgerRepository();

const transactionLedgerService = new TransactionLedgerService(
  transactionLedgerRepository,
);

const transactionService = new TransactionService(
  transactionRepository,
  transactionLedgerService,
);

const transactionController = new TransactionController(transactionService);
const transactionValidator = new TransactionValidator();

router.use(validateToken);

router.get(
  "/paginated",
  transactionController.getAllPaginated.bind(transactionController),
);

router.get(
  "/recent",
  transactionController.getRecentTransactions.bind(transactionController),
);

router
  .route("/")
  .get(transactionController.getAll.bind(transactionController))
  .post(
    transactionValidator.createValidator.bind(transactionValidator),
    transactionController.create.bind(transactionController),
  );

router
  .route("/:id")
  .get(transactionController.getById.bind(transactionController))
  .delete(transactionController.deleteById.bind(transactionController));

module.exports = router;
