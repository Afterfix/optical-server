const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");

const ExpenseRepository = require("./expense.repository");
const ExpenseService = require("./expense.service");
const ExpenseController = require("./expense.controller");
const ExpenseValidator = require("./expense.validator");

const LedgerRepository = require("../ledger/ledger.repository");
const LedgerService = require("../ledger/ledger.service");

// Voucher Dependencies for Expense Payment integration
const VoucherRepository = require("../voucher/voucher.repository");
const VoucherTransactionsService = require("../voucherTransaction/voucherTransaction.service");

const ledgerRepository = new LedgerRepository();
const ledgerService = new LedgerService(ledgerRepository);
const voucherRepository = new VoucherRepository();
const voucherTransactionsService = new VoucherTransactionsService();

const expenseRepository = new ExpenseRepository();
// Fixed injection with Voucher components
const expenseService = new ExpenseService(
  expenseRepository,
  ledgerService,
  voucherRepository,
  voucherTransactionsService
);

const expenseController = new ExpenseController(expenseService);
const expenseValidator = new ExpenseValidator();

router.use(validateToken);

router.get(
  "/paginated",
  expenseController.getAllPaginated.bind(expenseController)
);

router
  .route("/")
  .get(expenseController.getAll.bind(expenseController))
  .post(
    expenseValidator.createValidator.bind(expenseValidator),
    expenseController.create.bind(expenseController)
  );

router
  .route("/:id")
  .get(expenseController.getById.bind(expenseController))
  .put(
    expenseValidator.updateValidator.bind(expenseValidator),
    expenseController.update.bind(expenseController)
  )
  .delete(expenseController.delete.bind(expenseController));

module.exports = router;
