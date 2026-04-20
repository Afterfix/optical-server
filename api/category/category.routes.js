const express = require('express')
const router = express.Router()
const validateToken = require('../../middlewares/validateToken')

const CategoryRepository = require('./category.repository')
const TenantRepository = require('../../api/tenant/tenant.repository');
const CategoryService = require('./category.service')
const CategoryController = require('./category.controller')
const CategoryValidator = require('./category.validator')

// Init Stateless Classes
const categoryRepository = new CategoryRepository()
const tenantRepository = new TenantRepository()
const categoryService = new CategoryService(categoryRepository, tenantRepository)
const categoryController = new CategoryController(categoryService)
const categoryValidator = new CategoryValidator()

router.use(validateToken)

router
  .route('/')
  .get(categoryController.getAll.bind(categoryController))
  .post(
    categoryValidator.createValidator.bind(categoryValidator),
    categoryController.create.bind(categoryController)
  )

router
  .route('/:id')
  .get(categoryController.getById.bind(categoryController))
  .put(
    categoryValidator.createValidator.bind(categoryValidator),
    categoryController.update.bind(categoryController)
  )
  .delete(categoryController.delete.bind(categoryController))

module.exports = router