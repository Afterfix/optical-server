const express = require('express');
const router = express.Router();
const validateToken = require('../../middlewares/validateToken');
const CustomerRepository = require('./customer.repository');
const CustomerService = require('./customer.service');
const CustomerController = require('./customer.controller');
const CustomerValidator = require('./customer.validator');

const controller = new CustomerController(new CustomerService(new CustomerRepository()));
const validator = new CustomerValidator();

router.use(validateToken);
router.route('/').get(controller.getAll.bind(controller)).post(validator.createValidator, controller.create.bind(controller));
router.route('/:id').get(controller.getById.bind(controller)).put(controller.update.bind(controller)).delete(controller.delete.bind(controller));

module.exports = router;