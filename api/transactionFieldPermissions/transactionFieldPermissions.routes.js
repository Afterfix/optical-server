const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");

const TransactionFieldPermissionsRepository = require("./transactionFieldPermissions.repository");
const TransactionFieldPermissionsService = require("./transactionFieldPermissions.service");
const TransactionFieldPermissionsController = require("./transactionFieldPermissions.controller");

const repository = new TransactionFieldPermissionsRepository();
const service = new TransactionFieldPermissionsService(repository);
const controller = new TransactionFieldPermissionsController(service);

router.use(validateToken);
router.get("/", controller.get.bind(controller));
router.put("/:id", controller.update.bind(controller));

module.exports = router;