const express = require('express')
const router = express.Router()
const db = require('../../config/db')
const isSuperAdmin = require('../../middlewares/isSuperAdmin')

const TenantRepository = require('./tenant.repository')
const TenantService = require('./tenant.service')
const TenantController = require('./tenant.controller')
const TenantValidator = require('./tenant.validator')
const RoleRepository = require('../role/role.repository') // Import RoleRepository
const UserRepository = require('../user/user.repository') // Import RoleRepository

// Initialize modules
const tenantRepository = new TenantRepository(db)
const userRepository = new UserRepository(db)
const roleRepository = new RoleRepository(db) // Instantiate RoleRepository
const tenantService = new TenantService(
  tenantRepository,
  roleRepository,
  userRepository
) // Pass it to the service
const tenantController = new TenantController(tenantService)
const tenantValidator = new TenantValidator()

// Main routes for GET (all) and POST (create)
router.use(isSuperAdmin)

router
  .route('/')
  .get(tenantController.getAll.bind(tenantController))
  .post(
    tenantValidator.createValidator,
    tenantController.create.bind(tenantController)
  )

// Routes for a specific tenant by ID
router
  .route('/:id')
  .get(tenantController.getById.bind(tenantController))
  .put(
    tenantValidator.updateValidator,
    tenantController.update.bind(tenantController)
  )
  .delete(tenantController.delete.bind(tenantController))

module.exports = router
