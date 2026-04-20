const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");
const LensesRepository = require("./lenses.repository");
const LensesService = require("./lenses.service");
const LensesController = require("./lenses.controller");
const LensesValidator = require("./lenses.validator");
const TenantRepository = require("../../api/tenant/tenant.repository");

const repo = new LensesRepository();
const tenantRepo = new TenantRepository();
const service = new LensesService(repo, tenantRepo);
const controller = new LensesController(service);
const validator = new LensesValidator();

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
