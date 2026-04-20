const express = require("express");
const router = express.Router();
// const db = require('../../config/db') // No longer needed here
const validateToken = require("../../../apps/gadgetx/middlewares/validateToken"); // Adjust path if needed

const UnitRepository = require("./unit.repository");
const TenantRepository = require("../../../api/tenant/tenant.repository");
const UnitService = require("./unit.service");
const UnitController = require("./unit.controller");
const UnitValidator = require("./unit.validator");

const unitRepository = new UnitRepository();
const tenantRepository = new TenantRepository();
const unitService = new UnitService(unitRepository, tenantRepository);
const unitController = new UnitController(unitService);
const unitValidator = new UnitValidator();

// Apply token validation middleware to all unit routes
router.use(validateToken);

router
  .route("/")
  .get(unitController.getAll.bind(unitController))
  .post(
    unitValidator.createValidator.bind(unitValidator),
    unitController.create.bind(unitController)
  );

router
  .route("/:id")
  .get(unitController.getById.bind(unitController))
  .put(
    unitValidator.createValidator.bind(unitValidator),
    unitController.update.bind(unitController)
  )
  .delete(unitController.delete.bind(unitController));

module.exports = router;
