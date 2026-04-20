class TenantValidator {
  createValidator = (req, res, next) => {
    const requiredFields = ['name', 'type', 'plan', 'username', 'password']
    const allowedTypes = [
      'vehicle',
      'buildx',
      'fitness',
      'gadget',
      'travelx',
      'invoice',
      'inventory',
    ]
    const missingFields = requiredFields.filter(
      (field) => !req.body[field] || req.body[field].toString().trim() === ''
    )

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
      })
    }

    if (!allowedTypes.includes(req.body.type)) {
      return res.status(400).json({
        error: `Invalid type. Allowed values are: ${allowedTypes.join(', ')}`,
      })
    }

    next()
  }

  updateValidator = (req, res, next) => {
    const requiredFields = ['name', 'type', 'plan', 'username', 'password']
    const allowedTypes = [
      'vehicle',
      'restaurant',
      'fitness',
      'garage',
      'gadget',
      'travelx',
    ]

    if (req.body.type && !allowedTypes.includes(req.body.type)) {
      return res.status(400).json({
        error: `Invalid type. Allowed values are: ${allowedTypes.join(', ')}`,
      })
    }

    next()
  }
}

module.exports = TenantValidator