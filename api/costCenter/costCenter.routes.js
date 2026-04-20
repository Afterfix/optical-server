const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");
const db = require("../../config/db"); // ✅ Import db

const CostCenterRepository = require("./costCenter.repository");
const TenantRepository = require("../tenant/tenant.repository");  
const CostCenterService = require("./costCenter.service");
const CostCenterController = require("./costCenter.controller");
const CostCenterValidator = require("./costCenter.validator");

// ✅ Inject 'db' into Repositories
const costCenterRepository = new CostCenterRepository(db);
const tenantRepository = new TenantRepository(db);

// Init Service with dependencies
const costCenterService = new CostCenterService(
  costCenterRepository,
  tenantRepository
);
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