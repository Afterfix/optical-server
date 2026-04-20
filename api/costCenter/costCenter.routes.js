const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");

const CostCenterRepository = require("./costCenter.repository");
const TenantRepository = require("../tenant/tenant.repository");  
const CostCenterService = require("./costCenter.service");
const CostCenterController = require("./costCenter.controller");
const CostCenterValidator = require("./costCenter.validator");

// Init Repositories
const costCenterRepository = new CostCenterRepository();
const tenantRepository = new TenantRepository();

// Init Service with dependencies
const costCenterService = new CostCenterService(
  costCenterRepository,
  tenantRepository
); // MODIFIED
const costCenterController = new CostCenterController(costCenterService);
const costCenterValidator = new CostCenterValidator();

router.use(validateToken);

router
  .route("/")
  .get(costCenterController.getAll.bind(costCenterController))
  .post(
    costCenterValidator.createValidator.bind(costCenterValidator),
    costCenterController.create.bind(costCenterController)
  );

router
  .route("/:id")
  .get(costCenterController.getById.bind(costCenterController))
  .put(
    costCenterValidator.updateValidator.bind(costCenterValidator),
    costCenterController.update.bind(costCenterController)
  )
  .delete(costCenterController.delete.bind(costCenterController));

module.exports = router;
