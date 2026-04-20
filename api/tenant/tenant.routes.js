const express = require('express')
const router = express.Router()
const isSuperAdmin = require('../../middlewares/isSuperAdmin')

const TenantRepository = require('./tenant.repository')
const TenantService = require('./tenant.service')
const TenantController = require('./tenant.controller')
const TenantValidator = require('./tenant.validator')
const RoleRepository = require('../role/role.repository') 
const UserRepository = require('../user/user.repository') 
const UserSettingsRepository = require('../../apps/wheelx/api/userSettings/userSettings.repository') 

// --- 1. Import TRAVELX Modules (Repositories & Services) ---
const TravelXLedgerRepository = require('../../apps/travelx/api/ledger/ledger.repository')
const TravelXLedgerService = require('../../apps/travelx/api/ledger/ledger.service') 
const TravelXPartyRepository = require('../../apps/travelx/api/party/party.repository')
const TravelXPartyService = require('../../apps/travelx/api/party/party.service')

// --- 2. Import GADGETX Modules (Repositories & Services) ---
const GadgetXLedgerRepository = require('../inventorygadgetx/ledger/ledger.repository')
const GadgetXLedgerService = require('../inventorygadgetx/ledger/ledger.service')
const GadgetXPartyRepository = require('../inventorygadgetx/party/party.repository')
const GadgetXPartyService = require('../inventorygadgetx/party/party.service')

// --- 3. Instantiate Base Repositories ---
const tenantRepository = new TenantRepository()  
const userRepository = new UserRepository()      
const roleRepository = new RoleRepository()      
const userSettingsRepository = new UserSettingsRepository() 

// --- 4. Instantiate TRAVELX Services ---
const travelXLedgerRepository = new TravelXLedgerRepository()
// We pass the repository to the service
const travelXLedgerService = new TravelXLedgerService(travelXLedgerRepository)

const travelXPartyRepository = new TravelXPartyRepository()
// We pass the PartyRepo AND the LedgerService to the PartyService
const travelXPartyService = new TravelXPartyService(travelXPartyRepository, travelXLedgerService)

// --- 5. Instantiate GADGETX Services ---
const gadgetXLedgerRepository = new GadgetXLedgerRepository()
const gadgetXLedgerService = new GadgetXLedgerService(gadgetXLedgerRepository)

const gadgetXPartyRepository = new GadgetXPartyRepository()
const gadgetXPartyService = new GadgetXPartyService(gadgetXPartyRepository, gadgetXLedgerService)

// --- 6. Initialize Tenant Service with all dependencies ---
const tenantService = new TenantService(
  tenantRepository,
  roleRepository,
  userRepository,
  userSettingsRepository,
  travelXLedgerRepository, 
  gadgetXLedgerRepository,
  travelXPartyService, // Pass the instantiated TravelX Party Service
  gadgetXPartyService  // Pass the instantiated GadgetX Party Service
)

const tenantController = new TenantController(tenantService)
const tenantValidator = new TenantValidator()

router.use(isSuperAdmin)

router
  .route('/')
  .get(tenantController.getAll.bind(tenantController))
  .post(
    tenantValidator.createValidator,
    tenantController.create.bind(tenantController)
  )

router
  .route('/:id')
  .get(tenantController.getById.bind(tenantController))
  .put(
    tenantValidator.updateValidator,
    tenantController.update.bind(tenantController)
  )
  .delete(tenantController.delete.bind(tenantController))

module.exports = router