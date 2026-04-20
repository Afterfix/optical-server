const express = require("express");
const router = express.Router();
const validateToken = require("../../../apps/gadgetx/middlewares/validateToken");

const RoleRepository = require("./role.repository");
const RoleService = require("./role.service");
const RoleController = require("./role.controller");
const RoleValidator = require("./role.validator");
const TenantRepository = require("../../../../api/tenant/tenant.repository");

// Instantiate all the necessary classes
const roleRepository = new RoleRepository();
const tenantRepository = new TenantRepository();
const roleService = new RoleService(roleRepository, tenantRepository);
const roleController = new RoleController(roleService);
const roleValidator = new RoleValidator();

// Protect all routes in this file with token validation
router.use(validateToken);

// Define the RESTful routes for the "role" resource
router
  .route("/")
  .get(roleController.getAll.bind(roleController))
  .post(
    roleValidator.createValidator,
    roleController.create.bind(roleController),
  );

router
  .route("/:id")
  .get(roleController.getById.bind(roleController))
  .put(
    roleValidator.updateValidator,
    roleController.update.bind(roleController),
  )
  .delete(roleController.delete.bind(roleController));

module.exports = router;
