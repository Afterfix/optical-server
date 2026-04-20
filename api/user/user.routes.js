const express = require("express");
const router = express.Router();

// Middlewares
const validateToken = require("../../apps/physiquex/middlewares/validateToken");
const isAdminOrSuperAdmin = require("../../apps/physiquex/middlewares/isAdminOrSuperAdmin");

// Dependencies
const UserRepository = require("./user.repository");
const UserService = require("./user.service");
const UserController = require("./user.controller");
const TokenRepository = require("../token/token.repository");
const TokenService = require("../token/token.service");

// New Dependencies for Settings Logic
const TenantRepository = require("../tenant/tenant.repository");
const UserSettingsRepository = require("../../apps/wheelx/api/userSettings/userSettings.repository");

// Dependency Injection (Stateless)
const userRepository = new UserRepository();
const tokenRepository = new TokenRepository();
const tenantRepository = new TenantRepository();
const userSettingsRepository = new UserSettingsRepository();

const tokenService = new TokenService(tokenRepository, userRepository);

// Inject Tenant and UserSettings repositories into UserService
const userService = new UserService(
  userRepository, 
  tokenService, 
  tenantRepository, 
  userSettingsRepository
);

const userController = new UserController(userService);

//  Require authentication for all user routes
router.use(validateToken);

router
  .route("/profile")
  .get(userController.getProfile.bind(userController))
  .put(userController.updateProfile.bind(userController))
  .delete(userController.deleteProfile.bind(userController));

// Routes below this line are protected for Admins and Super Admins
router.use(isAdminOrSuperAdmin);

router.route("/").get(userController.getAllPaginated.bind(userController));

router.get("/all", userController.getAll.bind(userController));

router
  .route("/:id")
  .get(userController.getById.bind(userController))
  .put(userController.updateUserById.bind(userController))
  .delete(userController.deleteUserById.bind(userController));

router
  .route("/role-based/:id")
  .get(userController.getById.bind(userController))
  .put(userController.updateUserById.bind(userController))
  .delete(userController.deleteUserById.bind(userController))
  .post(userController.createUser.bind(userController));

module.exports = router;