// features/auth/auth.routes.js
const express = require('express')
const router = express.Router()

const validateToken = require('../../middlewares/validateToken')
const UserRepository = require('../user/user.repository')
const TokenRepository = require('../token/token.repository')
const TokenService = require('../token/token.service')
const AuthService = require('./auth.service')
const AuthController = require('./auth.controller')
const db = require('../../config/db')

// --- CORRECT IMPORT ---
// Import the specific validator arrays and the validate middleware
const {
  registerValidator,
  loginValidator,
  validate,
} = require('./auth.validator')

// --- Dependency Injection ---
const userRepository = new UserRepository(db)
const tokenRepository = new TokenRepository(db)
const tokenService = new TokenService(tokenRepository, userRepository)
const authService = new AuthService(userRepository, tokenService)
const authController = new AuthController(authService, tokenService)

// --- Public Routes ---
router.post(
  '/login',
  loginValidator, // Apply the validation rules for login
  validate, // Check for validation errors
  authController.login.bind(authController)
)

router.post(
  '/register',
  registerValidator, // Apply the validation rules for registration
  validate, // Check for validation errors
  authController.register.bind(authController)
)

router.post(
  '/register',
  registerValidator, // Apply the validation rules for registration
  validate, // Check for validation errors
  authController.register.bind(authController)
)

// --- Protected Routes ---
router.use(validateToken)

router.post('/logout', authController.logout.bind(authController))
router.post('/refresh', authController.refreshToken.bind(authController))

module.exports = router
