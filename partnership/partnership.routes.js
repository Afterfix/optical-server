const express = require('express')
const router = express.Router()
const validateToken = require('../../../apps/gadgetx/middlewares/validateToken')

const PartnershipRepository = require('./partnership.repository')
const PartnershipService = require('./partnership.service')
const PartnershipController = require('./partnership.controller')
const PartnershipValidator = require('./partnership.validator')

const TransactionRepository = require('../transaction/transaction.repository')
const TransactionService = require('../transaction/transaction.service')
const TransactionLedgerRepository = require('../transactionLedger/transactionLedger.repository')
const TransactionLedgerService = require('../transactionLedger/transactionLedger.service')

const TenantRepository = require('../../../api/tenant/tenant.repository');

// Initialize Repositories (Stateless)
const partnershipRepository = new PartnershipRepository()
const tenantRepository = new TenantRepository()

// Initialize Transaction Stack (Stateless)
const transactionRepository = new TransactionRepository()
const transactionLedgerRepository = new TransactionLedgerRepository()
const transactionLedgerService = new TransactionLedgerService(transactionLedgerRepository)
const transactionService = new TransactionService(transactionRepository, transactionLedgerService)

// Initialize Partnership Service with TransactionService
const partnershipService = new PartnershipService(
  partnershipRepository,
  transactionService
)

const partnershipController = new PartnershipController(partnershipService)
const partnershipValidator = new PartnershipValidator()

router.use(validateToken)

router.get(
  '/paginated',
  partnershipController.getAllPaginated.bind(partnershipController)
)

router
  .route('/')
  .get(partnershipController.getAll.bind(partnershipController))
  .post(
    partnershipValidator.createValidator.bind(partnershipValidator),
    partnershipController.create.bind(partnershipController)
  )

router
  .route('/:id')
  .get(partnershipController.getById.bind(partnershipController))
  .put(
    partnershipValidator.updateValidator.bind(partnershipValidator),
    partnershipController.update.bind(partnershipController)
  )
  .delete(partnershipController.delete.bind(partnershipController))

module.exports = router