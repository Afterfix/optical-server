const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");

const PayrollRepository = require("./payroll.repository");
const TenantRepository = require("../../api/tenant/tenant.repository");
const PayrollController = require("./payroll.controller");
const PayrollService = require("./payroll.service");
const PayrollValidator = require("./payroll.validator");
// REMOVED: const db = require('../../config/db')

// --- Transaction Dependencies ---
const TransactionRepository = require("../transaction/transaction.repository");
const TransactionService = require("../transaction/transaction.service");
const TransactionLedgerRepository = require("../transactionLedger/transactionLedger.repository");
const TransactionLedgerService = require("../transactionLedger/transactionLedger.service");

// Stateless Init
const payrollRepository = new PayrollRepository();
const tenantRepository = new TenantRepository();

const transactionRepository = new TransactionRepository();
const transactionLedgerRepository = new TransactionLedgerRepository();
const transactionLedgerService = new TransactionLedgerService(
  transactionLedgerRepository
);
const transactionService = new TransactionService(
  transactionRepository,
  transactionLedgerService
);

// Inject TransactionService into PayrollService
const payrollService = new PayrollService(
  payrollRepository,
  tenantRepository,
  transactionService
);
const payrollController = new PayrollController(payrollService);
const payrollValidator = new PayrollValidator();

router.use(validateToken);

router.get(
  "/paginated",
  payrollController.getAllPaginated.bind(payrollController)
);

router.post(
  "/bulk",
  payrollValidator.createBulkValidator.bind(payrollValidator),
  payrollController.createBulk.bind(payrollController)
);

router
  .route("/")
  .get(payrollController.getAllPayrolls.bind(payrollController))
  .post(
    payrollValidator.createValidator.bind(payrollValidator),
    payrollController.create.bind(payrollController)
  );

router
  .route("/:id")
  .get(payrollController.getById.bind(payrollController))
  .put(
    payrollValidator.updateValidator.bind(payrollValidator),
    payrollController.update.bind(payrollController)
  )
  .delete(payrollController.delete.bind(payrollController));

module.exports = router;
