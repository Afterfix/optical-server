const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");
const LensAddonsRepository = require("./lensAddons.repository");
const LensAddonsService = require("./lensAddons.service");
const LensAddonsController = require("./lensAddons.controller");
const LensAddonsValidator = require("./lensAddons.validator");
const TenantRepository = require("../../api/tenant/tenant.repository");

const repo = new LensAddonsRepository();
const tenantRepo = new TenantRepository();
const service = new LensAddonsService(repo, tenantRepo);
const controller = new LensAddonsController(service);
const validator = new LensAddonsValidator();

router.use(validateToken);

router.get("/paginated", controller.getAllPaginated.bind(controller));

router
  .route("/")
  .get(controller.getAll.bind(controller))
  .post(validator.createValidator, controller.create.bind(controller));

router
  .route("/:id")
  .get(controller.getById.bind(controller))
  .put(validator.updateValidator, controller.update.bind(controller))
  .delete(controller.delete.bind(controller));

module.exports = router;
