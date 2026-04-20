class InvoiceNumberValidator {
  getValidator = (req, res, next) => {
    const requiredFields = ['type']
    const missingFields = requiredFields.filter((field) => !req.query[field])

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required query parameters: ${missingFields.join(', ')}`,
      })
    }

    next()
  }

  generatorValidator = (req, res, next) => {
    const requiredFields = ['type']
    const missingFields = requiredFields.filter((field) => !req.body[field])

    if (missingFields.length > 0) {
      return res.status(400).json({
        // FIX: Changed the error message to be more accurate
        error: `Missing required fields in body: ${missingFields.join(', ')}`,
      })
    }

    next()
  }
}

module.exports = InvoiceNumberValidator