const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");
const ItemRepository = require("./item.repository");
const ItemService = require("./item.service");
const ItemController = require("./item.controller");
const ItemValidator = require("./item.validator");
const { upload } = require("../../middlewares/upload"); 
const ItemCustomFieldValuesRepository = require("../itemCustomFieldValues/itemCustomFieldValues.repository");

// Initialize without db injection
const itemRepository = new ItemRepository();
const customFieldsRepo = new ItemCustomFieldValuesRepository();
const itemService = new ItemService(itemRepository, customFieldsRepo);
const itemController = new ItemController(itemService);
const itemValidator = new ItemValidator();

router.use(validateToken);

router.get("/paginated", itemController.getAllPaginated.bind(itemController));

router
  .route("/")
  .get(itemController.getAll.bind(itemController))
  .post(
    upload.single("image"), 
    itemValidator.createValidator.bind(itemValidator),
    itemController.create.bind(itemController)
  );

router
  .route("/:id")
  .get(itemController.getById.bind(itemController))
  .put(
    upload.single("image"),
    itemValidator.updateValidator.bind(itemValidator),
    itemController.update.bind(itemController)
  )
  .delete(itemController.delete.bind(itemController));

module.exports = router;