
class EmployeePositionValidator {
  createValidator = (req, res, next) => {
    const requiredFields = ['name'];
    const missingFields = requiredFields.filter((field) => !req.body[field] || req.body[field].trim() === '');

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing or empty required fields: ${missingFields.join(', ')}`,
      });
    }

    next();
  };

  updateValidator = (req, res, next) => {
    if (req.body.name !== undefined && req.body.name.trim() === '') {
       return res.status(400).json({
          error: `Field 'name' cannot be empty.`,
       });
    }

    next();
  };
}

module.exports = EmployeePositionValidator;