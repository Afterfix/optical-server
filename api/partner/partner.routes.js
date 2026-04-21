const express = require('express')
const router = express.Router()
const validateToken = require('../../middlewares/validateToken')
const PartnerRepository = require('./partner.repository')
const PartnerService = require('./partner.service')
const PartnerController = require('./partner.controller')
const PartnerValidator = require('./partner.validator')
const AccountRepository = require('../account/account.repository') 

// Initialize modules
// We instantiate AccountRepository without db, as db is now passed in method calls
const accountRepository = new AccountRepository()
const partnerRepository = new PartnerRepository(accountRepository) 
const partnerService = new PartnerService(partnerRepository)
const partnerController = new PartnerController(partnerService)
const partnerValidator = new PartnerValidator()

router.use(validateToken)

// Route for getting paginated results.
router.get(
  '/paginated',
  partnerController.getAllPaginated.bind(partnerController)
)

// This route gets the simple, unfiltered list and handles creation.
router
  .route('/')
  .get(partnerController.getAll.bind(partnerController))
  .post(
    partnerValidator.createValidator.bind(partnerValidator),
    partnerController.create.bind(partnerController)
  )

router
  .route('/:id')
  .get(partnerController.getById.bind(partnerController))
  .put(
    partnerValidator.updateValidator.bind(partnerValidator),
    partnerController.update.bind(partnerController)
  )
  .delete(partnerController.delete.bind(partnerController))

module.exports = router