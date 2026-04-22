const express = require('express')
const router = express.Router()
const validateToken = require('../../middlewares/validateToken')
const { upload } = require('../../middlewares/upload')

const SettingsRepository = require('./printSettings.repository')
const SettingsService = require('./printSettings.service')
const SettingsController = require('./printSettings.controller')

// Stateless Instantiation
const repository = new SettingsRepository()
const service = new SettingsService(repository)
const controller = new SettingsController(service)

router.use(validateToken)

router
  .route('/')
  .get(controller.get.bind(controller))
  .put(
    upload.fields([
      { name: 'header_image', maxCount: 1 },
      { name: 'qr_image', maxCount: 1 }
    ]), 
    controller.update.bind(controller)
  )

module.exports = router