const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");

const VoucherRepository = require("./voucher.repository");
const VoucherService = require("./voucher.service");
const VoucherController = require("./voucher.controller");
const VoucherValidator = require("./voucher.validator");
const VoucherTransactionsService = require("../voucherTransaction/voucherTransaction.service");

const ItemRepository = require("../item/item.repository");
const SalesRepository = require("../sales/sales.repository");
const SalesService = require("../sales/sales.service");
const PurchaseRepository = require("../purchase/purchase.repository");
const PurchaseService = require("../purchase/purchase.service");
const SaleReturnRepository = require("../saleReturn/saleReturn.repository");
const SaleReturnService = require("../saleReturn/saleReturn.service");
const PurchaseReturnRepository = require("../purchaseReturn/purchaseReturn.repository");
const PurchaseReturnService = require("../purchaseReturn/purchaseReturn.service");
const LedgerRepository = require("../ledger/ledger.repository");
const LedgerService = require("../ledger/ledger.service");
const ExpenseRepository = require("../expense/expense.repository");
const ExpenseService = require("../expense/expense.service");

const itemRepository = new ItemRepository();
const ledgerService = new LedgerService(new LedgerRepository());
const expenseService = new ExpenseService(
  new ExpenseRepository(),
  ledgerService,
);

const voucherService = new VoucherService(
  new VoucherRepository(),
  new VoucherTransactionsService(),
  new SalesService(new SalesRepository(), itemRepository),
  new PurchaseService(new PurchaseRepository(), itemRepository),
  new SaleReturnService(
    new SaleReturnRepository(),
    new SalesRepository(),
    itemRepository,
  ),
  new PurchaseReturnService(
    new PurchaseReturnRepository(),
    new PurchaseRepository(),
    itemRepository,
  ),
  ledgerService,
  expenseService,
);

const voucherController = new VoucherController(voucherService);
const voucherValidator = new VoucherValidator();

router.use(validateToken);
router.get(
  "/paginated",
  voucherController.getAllPaginated.bind(voucherController),
);
router
  .route("/")
  .post(
    voucherValidator.createOrUpdateValidator,
    voucherController.create.bind(voucherController),
  )
  .get(voucherController.getAll.bind(voucherController));
router
  .route("/:id")
  .get(voucherController.getById.bind(voucherController))
  .put(
    voucherValidator.createOrUpdateValidator,
    voucherController.update.bind(voucherController),
  )
  .delete(voucherController.delete.bind(voucherController));

module.exports = router;
