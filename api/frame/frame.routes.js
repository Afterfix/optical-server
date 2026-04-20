const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");
const FrameRepository = require("./frame.repository");
const FrameService = require("./frame.service");
const FrameController = require("./frame.controller");
const FrameValidator = require("./frame.validator");
const TenantRepository = require("../../api/tenant/tenant.repository");

const frameRepository = new FrameRepository();
const tenantRepository = new TenantRepository();
const frameService = new FrameService(frameRepository, tenantRepository);
const frameController = new FrameController(frameService);
const frameValidator = new FrameValidator();

router.use(validateToken);

router.get("/paginated", frameController.getAllPaginated.bind(frameController));

router
  .route("/")
  .get(frameController.getAll.bind(frameController))
  .post(
    frameValidator.createValidator,
    frameController.create.bind(frameController),
  );

router
  .route("/:id")
  .get(frameController.getById.bind(frameController))
  .put(
    frameValidator.updateValidator,
    frameController.update.bind(frameController),
  )
  .delete(frameController.delete.bind(frameController));

module.exports = router;
