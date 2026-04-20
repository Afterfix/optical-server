const express = require('express');
const router = express.Router();
// const db = require('../../config/db'); // No longer needed
const validateToken = require('../../middlewares/validateToken');
const isAdminOrSuperAdmin = require('../../middlewares/isAdminOrSuperAdmin'); // This is updated

const SettingsRepository = require('./settings.repository');
const SettingsService = require('./settings.service');
const SettingsController = require('./settings.controller');
const SettingsValidator = require('./settings.validator');
const UserRepository = require('../../api/user/user.repository'); // This is updated

const repository = new SettingsRepository();
const userRepository = new UserRepository(); // This is updated
const service = new SettingsService(repository, userRepository); // This is updated
const controller = new SettingsController(service);
const validator = new SettingsValidator();

router.use(validateToken);

router.route('/')
    .get(controller.get.bind(controller))
    .put(
        validator.updateValidator.bind(validator),
        controller.update.bind(controller)
    );

router.route('/user/:userId')
    .all(isAdminOrSuperAdmin) 
    .get(controller.getSettingsForUser.bind(controller))
    .put(
        validator.updateValidator.bind(validator),
        controller.updateSettingsForUser.bind(controller)
    );

module.exports = router;