const express = require("express");
const router = express.Router();
const validateToken = require("../../middlewares/validateToken");

const ExpenseTypeRepository = require("./expenseType.repository");
const ExpenseTypeService = require("./expenseType.service");
const ExpenseTypeController = require("./expenseType.controller");
const ExpenseTypeValidator = require("./expenseType.validator");

const expenseTypeRepository = new ExpenseTypeRepository();
const expenseTypeService = new ExpenseTypeService(expenseTypeRepository);
const expenseTypeController = new ExpenseTypeController(expenseTypeService);
const expenseTypeValidator = new ExpenseTypeValidator();

router.use(validateToken);

router
  .route("/")
  .get(expenseTypeController.getAll.bind(expenseTypeController))
  .post(
    expenseTypeValidator.createValidator.bind(expenseTypeValidator),
    expenseTypeController.create.bind(expenseTypeController)
  );

router
  .route("/:id")
  .get(expenseTypeController.getById.bind(expenseTypeController))
  .put(
    expenseTypeValidator.createValidator.bind(expenseTypeValidator),
    expenseTypeController.update.bind(expenseTypeController)
  )
  .delete(expenseTypeController.delete.bind(expenseTypeController));

module.exports = router;
