const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");
const db = require("../../config/db");

const ReportFieldPermissionsRepository = require("./reportFieldPermissions.repository");
const ReportFieldPermissionsService = require("./reportFieldPermissions.service");
const ReportFieldPermissionsController = require("./reportFieldPermissions.controller");
const ReportFieldPermissionsValidator = require("./reportFieldPermissions.validator");

// Dependency Injection
const repository = new ReportFieldPermissionsRepository();
const service = new ReportFieldPermissionsService(repository);
const controller = new ReportFieldPermissionsController(service);
const validator = new ReportFieldPermissionsValidator();

router.use(validateToken);

router.get("/", controller.get.bind(controller));

router.post(
  "/",
  validator.createValidator.bind(validator),
  controller.create.bind(controller),
);

router.put(
  "/:id",
  validator.idParamValidator.bind(validator),
  validator.updateValidator.bind(validator),
  controller.update.bind(controller),
);

module.exports = router;
