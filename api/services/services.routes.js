const express = require("express");
const router = express.Router();
const db = require("../../config/db");
const validateToken = require("../../middlewares/validateToken");
const ServicesRepository = require("./services.repository");
const ServicesService = require("./services.service");
const ServicesController = require("./services.controller");
const ServicesValidator = require("./services.validator");
const TenantRepository = require("../../api/tenant/tenant.repository");

const servicesRepository = new ServicesRepository(db);
const tenantRepository = new TenantRepository(db);
const servicesService = new ServicesService(servicesRepository, tenantRepository, db);
const servicesController = new ServicesController(servicesService);
const servicesValidator = new ServicesValidator();

router.use(validateToken);

router.get("/paginated", servicesController.getAllPaginated.bind(servicesController));

router
  .route("/")
  .get(servicesController.getAll.bind(servicesController))
  .post(
    servicesValidator.createValidator.bind(servicesValidator),
    servicesController.create.bind(servicesController)
  );

router
  .route("/:id")
  .get(servicesController.getById.bind(servicesController))
  .put(
    servicesValidator.updateValidator.bind(servicesValidator),
    servicesController.update.bind(servicesController)
  )
  .delete(servicesController.delete.bind(servicesController));

module.exports = router;