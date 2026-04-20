const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");
const PrescriptionRepository = require("./prescription.repository");
const PrescriptionService = require("./prescription.service");
const PrescriptionController = require("./prescription.controller");
const TenantRepository = require("../tenant/tenant.repository");

const prescriptionRepository = new PrescriptionRepository();
const tenantRepository = new TenantRepository();
const prescriptionService = new PrescriptionService(
  prescriptionRepository,
  tenantRepository,
);
const prescriptionController = new PrescriptionController(prescriptionService);

router.use(validateToken);

router.get(
  "/paginated",
  prescriptionController.getAllPaginated.bind(prescriptionController),
);

router
  .route("/")
  .get(prescriptionController.getAll.bind(prescriptionController))
  .post(prescriptionController.create.bind(prescriptionController));

router
  .route("/:id")
  .get(prescriptionController.getById.bind(prescriptionController))
  .put(prescriptionController.update.bind(prescriptionController))
  .delete(prescriptionController.delete.bind(prescriptionController));

module.exports = router;

class PrescriptionValidator {
  createValidator(req, res, next) {
    // Add validation logic for creating a prescription
    next();
  }

  updateValidator(req, res, next) {
    // Add validation logic for updating a prescription
    next();
  }
}

module.exports = PrescriptionValidator;
