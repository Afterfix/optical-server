const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");

const DoneByRepository = require("./doneBy.repository");
const TenantRepository = require("../tenant/tenant.repository");
const DoneByService = require("./doneBy.service");
const DoneByController = require("./doneBy.controller");
const DoneByValidator = require("./doneBy.validator");

const doneByRepository = new DoneByRepository();  
const tenantRepository = new TenantRepository();  

// Init Service with dependencies
const doneByService = new DoneByService(doneByRepository, tenantRepository);
const doneByController = new DoneByController(doneByService);
const doneByValidator = new DoneByValidator();

router.use(validateToken);

router
  .route("/")
  .get(doneByController.getAll.bind(doneByController))
  .post(
    doneByValidator.createValidator.bind(doneByValidator),
    doneByController.create.bind(doneByController)
  );

router
  .route("/:id")
  .get(doneByController.getById.bind(doneByController))
  .put(
    doneByValidator.updateValidator.bind(doneByValidator),
    doneByController.update.bind(doneByController)
  )
  .delete(doneByController.delete.bind(doneByController));

module.exports = router;