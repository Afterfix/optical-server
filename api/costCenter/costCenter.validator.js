class CostCenterValidator {
  createValidator = (req, res, next) => {
    const requiredFields = ['name'];
    const missingFields = requiredFields.filter((field) => !req.body[field] || req.body[field].trim() === '');

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    next();
  };

  // ADDED for PATCH/PUT operations
  updateValidator = (req, res, next) => {
    // For an update, no fields are strictly required, but if they exist, they should be valid.
    if (req.body.name !== undefined && req.body.name.trim() === '') {
       return res.status(400).json({
          error: `Field 'name' cannot be empty.`,
       });
    }

    next();
  };
}

module.exports = CostCenterValidator;