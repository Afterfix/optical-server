const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const validateToken = require("../../apps/physiquex/middlewares/validateToken");
const UserRepository = require("../user/user.repository");
const TokenRepository = require("../token/token.repository");
const TokenService = require("../token/token.service");
const AuthService = require("./auth.service");
const AuthController = require("./auth.controller");

const {
  registerValidator,
  loginValidator,
  validate,
} = require("./auth.validator");

const userRepository = new UserRepository();
const tokenRepository = new TokenRepository();
const tokenService = new TokenService(tokenRepository, userRepository);
const authService = new AuthService(userRepository, tokenService);
const authController = new AuthController(authService, tokenService);

const loginLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: "Too many failed login attempts. Please try again later.",
});

const authActionLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_ACTION_RATE_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many authentication requests. Please try again later.",
});

// --- Public Routes ---
router.post(
  "/login",
  loginLimiter,
  loginValidator,
  validate,
  authController.login.bind(authController)
);

router.post(
  "/register",
  authActionLimiter,
  registerValidator,
  validate,
  authController.register.bind(authController)
);

// --- Protected Routes ---
router.use(validateToken);

router.post("/logout", authActionLimiter, authController.logout.bind(authController));
router.post("/refresh", authActionLimiter, authController.refreshToken.bind(authController));

module.exports = router;
