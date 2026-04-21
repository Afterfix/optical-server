const express = require('express')
const InvoiceNumberRepository = require('./invoiceNumber.repository.js')
const InvoiceNumberService = require('./invoiceNumber.service.js')
const InvoiceNumberController = require('./invoiceNumber.controller.js')
const InvoiceNumberValidator = require('./invoiceNumber.validator.js')

const validateToken = require('../../middlewares/validateToken')

const router = express.Router()

// Initialize without db injection
const repo = new InvoiceNumberRepository()
const service = new InvoiceNumberService(repo)
const controller = new InvoiceNumberController(service)
const validator = new InvoiceNumberValidator()

router.use(validateToken)
router.get(
  '/',
  validator.getValidator.bind(validator),
  controller.get.bind(controller)
)
router.post(
  '/next',
  validator.generatorValidator.bind(validator),
  controller.generateNext.bind(controller)
)

module.exports = router