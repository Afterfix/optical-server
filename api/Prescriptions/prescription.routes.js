const express = require("express");
const router = express.Router();
const db = require("../../config/db");
const validateToken = require("../../middlewares/validateToken");
const PrescriptionRepository = require("./prescription.repository");
const PrescriptionService = require("./prescription.service");
const PrescriptionController = require("./prescription.controller");
const PrescriptionValidator = require("./prescription.validator");
const TenantRepository = require("../tenant/tenant.repository");

const prescriptionRepository = new PrescriptionRepository();
const tenantRepository = new TenantRepository(db);
const prescriptionService = new PrescriptionService(
  prescriptionRepository,
  tenantRepository,
);
const prescriptionController = new PrescriptionController(prescriptionService);
const prescriptionValidator = new PrescriptionValidator();

router.use(validateToken);

router.get(
  "/paginated",
  prescriptionController.getAllPaginated.bind(prescriptionController),
);

router
  .route("/")
  .get(prescriptionController.getAll.bind(prescriptionController))
  .post(
    prescriptionValidator.createValidator.bind(prescriptionValidator),
    prescriptionController.create.bind(prescriptionController),
  );

router
  .route("/:id")
  .get(prescriptionController.getById.bind(prescriptionController))
  .put(
    prescriptionValidator.updateValidator.bind(prescriptionValidator),
    prescriptionController.update.bind(prescriptionController),
  )
  .delete(prescriptionController.delete.bind(prescriptionController));

module.exports = router;
