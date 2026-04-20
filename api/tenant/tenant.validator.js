class TenantValidator {
  createValidator = (req, res, next) => {
    // 'type' is no longer required as it defaults to 'optical'
    const requiredFields = ['name', 'plan', 'username', 'password']
    const missingFields = requiredFields.filter(
      (field) => !req.body[field] || req.body[field].toString().trim() === ''
    )

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
      })
    }

    next()
  }

  updateValidator = (req, res, next) => {
    // Validation constraint removed. Type updates (if any) can be processed freely.
    next()
  }
}

module.exports = TenantValidator