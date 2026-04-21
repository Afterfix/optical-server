const express = require('express');
const router = express.Router();
const validateToken = require('../../middlewares/validateToken');

// --- Repositories ---
const AccountRepository = require('./account.repository');
const TenantRepository = require('../../api/tenant/tenant.repository');

// --- Services ---
const AccountService = require('./account.service');

// --- Controllers & Validators ---
const AccountController = require('./account.controller');
const AccountValidator = require('./account.validator');

// --- Initialization (Stateless) ---
const accountRepository = new AccountRepository();
const tenantRepository = new TenantRepository();




// Account Service depends on TransactionService
const accountService = new AccountService(
  accountRepository, 
  tenantRepository
);

const accountController = new AccountController(accountService);
const accountValidator = new AccountValidator();

// --- Middleware ---
router.use(validateToken);

// --- Routes ---
router
  .route('/')
  .get(accountController.getAll.bind(accountController))
  .post(
    accountValidator.createValidator.bind(accountValidator),
    accountController.create.bind(accountController)
  );

router
  .route('/:id')
  .get(accountController.getById.bind(accountController))
  .put(
    accountValidator.updateValidator.bind(accountValidator),
    accountController.update.bind(accountController)
  )
  .delete(accountController.delete.bind(accountController));

module.exports = router;