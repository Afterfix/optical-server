const express = require("express");
const router = express.Router();
const validateToken = require("../../../middlewares/validateToken");

const PurchaseRepository = require("./purchase.repository");
const PurchaseService = require("./purchase.service");
const PurchaseController = require("./purchase.controller");
const PurchaseValidator = require("./purchase.validator");

const LensesRepository = require("../lenses/lenses.repository");
const LensAddonsRepository = require("../lensesAddons/lensAddons.repository");
const FrameVariantRepository = require("../frameVarient/frameVariant.repository");
const AccountRepository = require("../account/account.repository");
const TenantRepository = require('../../../api/tenant/tenant.repository');

// --- Dependency Injection for Voucher Service ---
// We need VoucherService to create vouchers from Purchase
const VoucherRepository = require('../voucher/voucher.repository');
const VoucherService = require('../voucher/voucher.service');
const VoucherTransactionsService = require('../voucherTransaction/voucherTransaction.service');
const SalesRepository = require('../sales/sales.repository');
const SalesService = require('../sales/sales.service');
const SaleReturnRepository = require('../saleReturn/saleReturn.repository');
const SaleReturnService = require('../saleReturn/saleReturn.service');
const PurchaseReturnRepository = require('../purchaseReturn/purchaseReturn.repository');
const PurchaseReturnService = require('../purchaseReturn/purchaseReturn.service');
const LedgerRepository = require('../ledger/ledger.repository');
const LedgerService = require('../ledger/ledger.service');

// Initialize Repositories
const purchaseRepository = new PurchaseRepository();
const lensesRepository = new LensesRepository();
const lensAddonsRepository = new LensAddonsRepository();
const frameVariantRepository = new FrameVariantRepository();

const salesRepository = new SalesRepository();
const saleReturnRepository = new SaleReturnRepository();
const purchaseReturnRepository = new PurchaseReturnRepository();
const ledgerRepository = new LedgerRepository();
const voucherRepository = new VoucherRepository();
const voucherTransactionsService = new VoucherTransactionsService();

// Initialize Services
const salesService = new SalesService(
  salesRepository,
  lensesRepository,
  lensAddonsRepository,
  frameVariantRepository,
  null
);
// Initialize PurchaseService partially first to pass to VoucherService
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

// Initialize VoucherService with the purchaseService instance
const voucherService = new VoucherService(
    voucherRepository,
    voucherTransactionsService,
    salesService,
    purchaseService,
    saleReturnService,
    purchaseReturnService,
    ledgerService
);

// Now set the voucherService into the services
purchaseService.voucherService = voucherService;
salesService.voucherService = voucherService;
saleReturnService.voucherService = voucherService;
purchaseReturnService.voucherService = voucherService;

const purchaseController = new PurchaseController(purchaseService);
const purchaseValidator = new PurchaseValidator();

router.use(validateToken);

router.get(
  "/paginated",
  purchaseController.getAllPaginated.bind(purchaseController)
);

router
  .route("/")
  .post(
    purchaseValidator.createValidator.bind(purchaseValidator),
    purchaseController.create.bind(purchaseController)
  )
  .get(purchaseController.getAll.bind(purchaseController));

router
  .route("/:id")
  .get(purchaseController.getById.bind(purchaseController))
  .put(
    purchaseValidator.updateValidator.bind(purchaseValidator),
    purchaseController.update.bind(purchaseController)
  )
  .delete(purchaseController.delete.bind(purchaseController));

module.exports = router;