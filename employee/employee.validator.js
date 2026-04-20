class EmployeeValidator {
  createValidator = (req, res, next) => {
    const requiredFields = ['name', 'email', 'phone', 'employee_position_id', 'salary', 'hire_date'];
    const missingFields = requiredFields.filter((field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === '');

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }
    next();
  };

  updateValidator = (req, res, next) => {
    // For updates, fields are not required, but if they exist, they should not be empty.
    const fields = ['name', 'email', 'phone', 'employee_position_id', 'salary', 'hire_date'];
    for (const field of fields) {
        if (req.body[field] !== undefined && (req.body[field] === null || req.body[field] === '')) {
             return res.status(400).json({
                error: `Field '${field}' cannot be empty.`,
            });
        }
    }
    next();
  };
}

module.exports = EmployeeValidator;