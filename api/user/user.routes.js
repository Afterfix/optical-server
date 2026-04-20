
const express = require('express')
const router = express.Router()

// Middlewares
const validateToken = require('../../middlewares/validateToken')
const isAdminOrSuperAdmin = require('../../middlewares/isAdminOrSuperAdmin')

// Dependencies
const UserRepository = require('./user.repository')
const UserService = require('./user.service')
const UserController = require('./user.controller')
const TokenRepository = require('../token/token.repository')
const TokenService = require('../token/token.service')
const db = require('../../config/db')

// Dependency Injection
const userRepository = new UserRepository(db)
const tokenRepository = new TokenRepository(db)
const tokenService = new TokenService(tokenRepository, userRepository)
const userService = new UserService(userRepository, tokenService)
const userController = new UserController(userService)

// ✅ Require authentication for all user routes
router.use(validateToken)

router
  .route('/profile')
  .get(userController.getProfile.bind(userController))
  .put(userController.updateProfile.bind(userController))
  .delete(userController.deleteProfile.bind(userController))

// Routes below this line are protected for Admins and Super Admins
router.use(isAdminOrSuperAdmin)

router
  .route('/')
  .get(userController.getAllPaginated.bind(userController))

router.get('/all', userController.getAll.bind(userController))

router
  .route('/:id')
  .get(userController.getById.bind(userController))
  .put(userController.updateUserById.bind(userController))
  .delete(userController.deleteUserById.bind(userController))


// This route block is now redundant with the one above, but kept as per your file structure
router
  .route('/role-based/:id')
  .get(userController.getById.bind(userController))
  .put(userController.updateUserById.bind(userController))
  .delete(userController.deleteUserById.bind(userController))
  .post(userController.createUser.bind(userController));

  

module.exports = router