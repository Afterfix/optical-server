const express = require("express");
const router = express.Router();
const validateToken = require("../../../apps/gadgetx/middlewares/validateToken");

const SaleReturnRepository = require("./saleReturn.repository");
const SaleRepository = require("../sales/sales.repository");
const ItemRepository = require("../item/item.repository");
const VoucherRepository = require("../voucher/voucher.repository");
const LedgerRepository = require("../ledger/ledger.repository");

const SaleReturnService = require("./saleReturn.service");
const VoucherService = require("../voucher/voucher.service");
const VoucherTransactionsService = require("../voucherTransaction/voucherTransaction.service");
const LedgerService = require("../ledger/ledger.service");

const SaleReturnController = require("./saleReturn.controller");
const SaleReturnValidator = require("./saleReturn.validator");

const saleReturnRepository = new SaleReturnRepository();
const saleRepository = new SaleRepository();
const itemRepository = new ItemRepository();
const voucherRepository = new VoucherRepository();
const vtService = new VoucherTransactionsService();
const ledgerRepository = new LedgerRepository();
const ledgerService = new LedgerService(ledgerRepository);

const voucherService = new VoucherService(
  voucherRepository,
  vtService,
  null,
  null,
  null,
  null,
  ledgerService,
);

const saleReturnService = new SaleReturnService(
  saleReturnRepository,
  saleRepository,
  itemRepository,
  voucherService,
);

voucherService.saleReturnService = saleReturnService;

const controller = new SaleReturnController(saleReturnService);
const validator = new SaleReturnValidator();

router.use(validateToken);

router.get("/paginated", controller.getAllPaginated.bind(controller));

router
  .route("/")
  .get(controller.getAll.bind(controller))
  .post(
    validator.createValidator.bind(validator),
    controller.create.bind(controller),
  );

router
  .route("/:id")
  .get(
    validator.idParamValidator.bind(validator),
    controller.getById.bind(controller),
  )
  .put(
    validator.updateValidator.bind(validator),
    controller.update.bind(controller),
  )
  .delete(
    validator.idParamValidator.bind(validator),
    controller.delete.bind(controller),
  );

module.exports = router;
