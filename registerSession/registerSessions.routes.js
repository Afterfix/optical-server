const express = require("express");
const router = express.Router();
const validateToken = require("../../../apps/gadgetx/middlewares/validateToken");
// const db = require("../../config/db"); // No longer needed

const RegisterSessionsRepository = require("./registerSessions.Repository");
const RegisterSessionsService = require("./registerSessions.service");
const RegisterSessionsController = require("./registerSessions.controller");
const RegisterSessionsValidator = require("./registerSessions.validator");

// Instantiate
const repository = new RegisterSessionsRepository();
const service = new RegisterSessionsService(repository);
const controller = new RegisterSessionsController(service);
const validator = new RegisterSessionsValidator();

router.use(validateToken);

router.get("/current", controller.getCurrentSession.bind(controller));

router.get("/paginated", controller.getAllPaginated.bind(controller));

router.post(
  "/open", 
  validator.openValidator, 
  controller.openSession.bind(controller)
);

router.put(
  "/:id/close", 
  validator.closeValidator, 
  controller.closeSession.bind(controller)
);

// Get details/report of a specific session
router.get("/:id", controller.getById.bind(controller));

module.exports = router;