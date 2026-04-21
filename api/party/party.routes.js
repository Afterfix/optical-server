const express = require('express');
const router = express.Router();
const validateToken = require('../../middlewares/validateToken');
const PartyRepository = require('./party.repository');
const PartyService = require('./party.service');
const PartyController = require('./party.controller');
const PartyValidator = require('./party.validator');
// ADDED: Imports for Ledger module dependencies (assuming relative path)
const LedgerRepository = require('../ledger/ledger.repository'); 
const LedgerService = require('../ledger/ledger.service');       

// REMOVED: const db = require('../../config/db');

// Initialize modules (Stateless)
const partyRepository = new PartyRepository();

// ADDED: Initialize Ledger dependencies
const ledgerRepository = new LedgerRepository(); 
const ledgerService = new LedgerService(ledgerRepository); 

// MODIFIED: Pass ledgerService to PartyService constructor
const partyService = new PartyService(partyRepository, ledgerService); 

const partyController = new PartyController(partyService);
const partyValidator = new PartyValidator();

// Apply token validation middleware to all routes
router.use(validateToken);

// Route for getting the paginated and filtered list
router.get('/paginated', partyController.getAllPaginated.bind(partyController));

// Route for getting a simple list and creating a new party
router.route('/')
  .get(partyController.getAll.bind(partyController))
  .post(
    partyValidator.createValidator,
    partyController.create.bind(partyController)
  );

// Routes for a specific party by ID
router.route('/:id')
  .get(partyController.getById.bind(partyController))
  .put(
    partyValidator.updateValidator,
    partyController.update.bind(partyController)
  )
  .delete(partyController.delete.bind(partyController));

module.exports = router;