const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");
const EmployeeRepository = require("./employee.repository");
const TenantRepository = require("../../api/tenant/tenant.repository");
const EmployeeController = require("./employee.controller");
const EmployeeService = require("./employee.service");
const EmployeeValidator = require("./employee.validator");

// Init Repositories (No DB injection)
const employeeRepository = new EmployeeRepository();
const tenantRepository = new TenantRepository();

// Init Service with all dependencies
const employeeService = new EmployeeService(
  employeeRepository,
  tenantRepository
);
const employeeController = new EmployeeController(employeeService);
const employeeValidator = new EmployeeValidator();

router.use(validateToken);

router.get(
  "/paginated",
  employeeController.getAllPaginated.bind(employeeController)
);

router
  .route("/")
  .get(employeeController.getAll.bind(employeeController))
  .post(
    employeeValidator.createValidator.bind(employeeValidator),
    employeeController.create.bind(employeeController)
  );

router
  .route("/:id")
  .get(employeeController.getById.bind(employeeController))
  .put(
    employeeValidator.updateValidator.bind(employeeValidator),
    employeeController.update.bind(employeeController)
  )
  .delete(employeeController.delete.bind(employeeController));

module.exports = router;
