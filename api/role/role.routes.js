const express = require('express')
const router = express.Router()
const db = require('../../config/db')
const validateToken = require('../../middlewares/validateToken')

const RoleRepository = require('./role.repository')
const RoleService = require('./role.service')
const RoleController = require('./role.controller')
const RoleValidator = require('./role.validator')
const TenantRepository = require('../tenant/tenant.repository') // Import TenantRepository

// Instantiate all the necessary classes
const roleRepository = new RoleRepository(db)
const tenantRepository = new TenantRepository(db) // Instantiate TenantRepository
const roleService = new RoleService(roleRepository, tenantRepository) // Pass both to the service
const roleController = new RoleController(roleService)
const roleValidator = new RoleValidator()

// Protect all routes in this file with token validation
router.use(validateToken)

// Define the RESTful routes for the "role" resource
router
  .route('/')
  .get(roleController.getAll.bind(roleController))
  .post(
    roleValidator.createValidator,
    roleController.create.bind(roleController)
  )

router
  .route('/:id')
  .get(roleController.getById.bind(roleController))
  .put(
    roleValidator.updateValidator,
    roleController.update.bind(roleController)
  )
  .delete(roleController.delete.bind(roleController))

module.exports = router
