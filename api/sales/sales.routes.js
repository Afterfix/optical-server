const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");
const db = require("../../config/db");

const SalesRepository = require("./sales.repository");
const SalesService = require("./sales.service");
const SalesController = require("./sales.controller");
const SalesValidator = require("./sales.validator");

const LensesRepository = require("../lenses/lenses.repository");
const LensAddonsRepository = require("../lensesAddons/lensAddons.repository");
const FrameVariantRepository = require("../frameVarient/frameVariant.repository");

// --- Dependency Injection for Voucher Service ---
const VoucherRepository = require('../voucher/voucher.repository');
const VoucherService = require('../voucher/voucher.service');
const VoucherTransactionsService = require('../voucherTransaction/voucherTransaction.service');
const PurchaseRepository = require('../purchase/purchase.repository');
const PurchaseService = require('../purchase/purchase.service');
const SaleReturnRepository = require('../saleReturn/saleReturn.repository');
const SaleReturnService = require('../saleReturn/saleReturn.service');
const PurchaseReturnRepository = require('../purchaseReturn/purchaseReturn.repository');
const PurchaseReturnService = require('../purchaseReturn/purchaseReturn.service');
const LedgerRepository = require('../ledger/ledger.repository');
const LedgerService = require('../ledger/ledger.service');

// Initialize Repositories
const salesRepository = new SalesRepository(db);
const lensesRepository = new LensesRepository();
const lensAddonsRepository = new LensAddonsRepository();
const frameVariantRepository = new FrameVariantRepository();

const purchaseRepository = new PurchaseRepository();
const saleReturnRepository = new SaleReturnRepository();
const purchaseReturnRepository = new PurchaseReturnRepository();
const ledgerRepository = new LedgerRepository();
const voucherRepository = new VoucherRepository();
const voucherTransactionsService = new VoucherTransactionsService();

// Initialize Services
// Partially initialize SalesService (without voucherService yet) to pass to VoucherService
const salesService = new SalesService(
  salesRepository,
  lensesRepository,
  lensAddonsRepository,
  frameVariantRepository,
  null
); 

const purchaseService = new PurchaseService(
  purchaseRepository,
  lensesRepository,
  lensAddonsRepository,
  frameVariantRepository,
  null
);
const saleReturnService = new SaleReturnService(
  saleReturnRepository,
  salesRepository,
  lensesRepository,
  lensAddonsRepository,
  frameVariantRepository,
  null
);
const purchaseReturnService = new PurchaseReturnService(
  purchaseReturnRepository,
  purchaseRepository,
  lensesRepository,
  lensAddonsRepository,
  frameVariantRepository,
  null
);
const ledgerService = new LedgerService(ledgerRepository);

// Initialize VoucherService
const voucherService = new VoucherService(
    voucherRepository,
    voucherTransactionsService,
    salesService,
    purchaseService,
    saleReturnService,
    purchaseReturnService,
    ledgerService
);

// Now set the voucherService into the salesService
salesService.voucherService = voucherService;
purchaseService.voucherService = voucherService;
saleReturnService.voucherService = voucherService;
purchaseReturnService.voucherService = voucherService;

const salesController = new SalesController(salesService);
const salesValidator = new SalesValidator();

router.use(validateToken);

router.get(
  "/paginated",
  salesController.getAllPaginated.bind(salesController)
);

router
  .route("/")
  .get(salesController.getAll.bind(salesController))
  .post(
    salesValidator.createValidator.bind(salesValidator),
    salesController.create.bind(salesController)
  );

router
  .route("/:id")
  .get(
    salesValidator.idParamValidator.bind(salesValidator),
    salesController.getById.bind(salesController)
  )
  .put(
    salesValidator.updateValidator.bind(salesValidator),
    salesController.update.bind(salesController)
  )
  .delete(salesController.delete.bind(salesController));

module.exports = router;