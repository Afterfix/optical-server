const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");

const EmployeePositionRepository = require("./employeePosition.repository");
const TenantRepository = require("../../api/tenant/tenant.repository");
const EmployeePositionService = require("./employeePositionservice");
const EmployeePositionController = require("./employeePosition.controller");
const EmployeePositionValidator = require("./employeePosition.validator");

// Init Repositories without DB injection
const employeePositionRepository = new EmployeePositionRepository();
const tenantRepository = new TenantRepository();

// Init Service with all dependencies
const employeePositionService = new EmployeePositionService(
  employeePositionRepository,
  tenantRepository
);
const employeePositionController = new EmployeePositionController(
  employeePositionService
);
const employeePositionValidator = new EmployeePositionValidator();

router.use(validateToken);

router
  .route("/")
  .get(employeePositionController.getAll.bind(employeePositionController))
  .post(
    employeePositionValidator.createValidator.bind(employeePositionValidator),
    employeePositionController.create.bind(employeePositionController)
  );

router
  .route("/:id")
  .get(employeePositionController.getById.bind(employeePositionController))
  .put(
    employeePositionValidator.updateValidator.bind(employeePositionValidator),
    employeePositionController.update.bind(employeePositionController)
  )
  .delete(employeePositionController.delete.bind(employeePositionController));

module.exports = router;
