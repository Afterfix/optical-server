// --- START OF FILE purchaseReturn.routes.js ---

const express = require('express');
const router = express.Router();
const validateToken = require('../../../middlewares/validateToken');

const PurchaseReturnRepository = require('./purchaseReturn.repository');
const PurchaseRepository = require('../purchase/purchase.repository');
const ItemRepository = require('../item/item.repository');
const VoucherRepository = require('../voucher/voucher.repository');
const LedgerRepository = require('../ledger/ledger.repository');

const PurchaseReturnService = require('./purchaseReturn.service');
const VoucherService = require('../voucher/voucher.service');
const VoucherTransactionsService = require('../voucherTransaction/voucherTransaction.service');
const LedgerService = require('../ledger/ledger.service');

const PurchaseReturnController = require('./purchaseReturn.controller');
const PurchaseReturnValidator = require('./purchaseReturn.validator');

const purchaseReturnRepository = new PurchaseReturnRepository();
const purchaseRepository = new PurchaseRepository();
const itemRepository = new ItemRepository();
const voucherRepository = new VoucherRepository();
const vtService = new VoucherTransactionsService();
const ledgerRepository = new LedgerRepository();
const ledgerService = new LedgerService(ledgerRepository);

const voucherService = new VoucherService(
    voucherRepository,
    vtService,
    null, // salesService placeholder
    null, // purchaseService
    null, // saleReturnService
    null, // purchaseReturnService placeholder
    ledgerService
);

const purchaseReturnService = new PurchaseReturnService(
    purchaseReturnRepository, 
    purchaseRepository, 
    itemRepository,
    voucherService
);

// Inject back for status updates
voucherService.purchaseReturnService = purchaseReturnService;

const controller = new PurchaseReturnController(purchaseReturnService);
const validator = new PurchaseReturnValidator();

router.use(validateToken);

router.get('/paginated', controller.getAllPaginated.bind(controller));
router.route('/')
    .get(controller.getAll.bind(controller))
    .post(validator.createValidator.bind(validator), controller.create.bind(controller));

router.route('/:id')
    .get(controller.getById.bind(controller))
    .put(validator.updateValidator.bind(validator), controller.update.bind(controller))
    .delete(controller.delete.bind(controller));

module.exports = router;