const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");
const FrameVariantRepository = require("./frameVariant.repository");
const FrameRepository = require("../frame/frame.repository"); // Import Frame Repo
const TenantRepository = require("../../api/tenant/tenant.repository");
const FrameVariantService = require("./frameVariant.service");
const FrameVariantController = require("./frameVariant.controller");
const FrameVariantValidator = require("./frameVariant.validator");

const variantRepo = new FrameVariantRepository();
const frameRepo = new FrameRepository();
const tenantRepo = new TenantRepository();
const service = new FrameVariantService(variantRepo, tenantRepo, frameRepo);
const controller = new FrameVariantController(service);
const validator = new FrameVariantValidator();

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
