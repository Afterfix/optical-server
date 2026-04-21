const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");
const ModeOfPaymentRepository = require("./modeOfPayment.repository");
const ModeOfPaymentService = require("./modeOfPayment.service");
const ModeOfPaymentController = require("./modeOfPayment.controller");
const ModeOfPaymentValidator = require("./modeOfPayment.validator");
// REMOVE: const db = require('../../config/db'); // No longer needed

// Initialize modules
// REMOVE (db) from constructor: const modeOfPaymentRepository = new ModeOfPaymentRepository(db);
const modeOfPaymentRepository = new ModeOfPaymentRepository();
const modeOfPaymentService = new ModeOfPaymentService(modeOfPaymentRepository);
const modeOfPaymentController = new ModeOfPaymentController(
  modeOfPaymentService,
);
const modeOfPaymentValidator = new ModeOfPaymentValidator();

router.use(validateToken);

router
  .route("/")
  .get(modeOfPaymentController.getAll.bind(modeOfPaymentController))
  .post(
    modeOfPaymentValidator.createValidator,
    modeOfPaymentController.create.bind(modeOfPaymentController),
  );

router
  .route("/:id")
  .get(modeOfPaymentController.getById.bind(modeOfPaymentController))
  .put(
    modeOfPaymentValidator.updateValidator,
    modeOfPaymentController.update.bind(modeOfPaymentController),
  )
  .delete(modeOfPaymentController.delete.bind(modeOfPaymentController));

module.exports = router;
