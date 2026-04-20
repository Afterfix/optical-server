const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");

const BrandRepository = require("./brand.repository");
const TenantRepository = require("../../api/tenant/tenant.repository");
const BrandService = require("./brand.service");
const BrandController = require("./brand.controller");
const BrandValidator = require("./brand.validator");

// Instantiate Stateless
const brandRepository = new BrandRepository();
const tenantRepository = new TenantRepository();
const brandService = new BrandService(brandRepository, tenantRepository);
const brandController = new BrandController(brandService);
const brandValidator = new BrandValidator();

// Apply token validation middleware to all brand routes
router.use(validateToken);

router
  .route("/")
  .get(brandController.getAll.bind(brandController))
  .post(
    brandValidator.createValidator.bind(brandValidator),
    brandController.create.bind(brandController)
  );

router
  .route("/:id")
  .get(brandController.getById.bind(brandController))
  .put(
    brandValidator.createValidator.bind(brandValidator),
    brandController.update.bind(brandController)
  )
  .delete(brandController.delete.bind(brandController));

module.exports = router;
