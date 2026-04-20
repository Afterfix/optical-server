class PayrollValidator {
  _validateSingle(item, index = null, isUpdate = false) {
    const errorPrefix = index !== null ? ` in item at index ${index}` : "";

    if (!isUpdate) {
      const requiredFields = ["employee_id", "salary", "pay_date"];
      const missingFields = requiredFields.filter(
        (field) => item[field] == null
      );
      if (missingFields.length > 0) {
        return `Missing required fields${errorPrefix}: ${missingFields.join(
          ", "
        )}`;
      }
    }

    if (
      item.employee_id !== undefined &&
      (typeof item.employee_id !== "number" ||
        !Number.isInteger(item.employee_id) ||
        item.employee_id <= 0)
    ) {
      return `Invalid employee_id${errorPrefix}. Must be a positive integer.`;
    }
    if (
      item.salary !== undefined &&
      (typeof item.salary !== "number" || item.salary <= 0)
    ) {
      return `Salary must be a positive number${errorPrefix}.`;
    }
    if (
      item.pay_date !== undefined &&
      isNaN(new Date(item.pay_date).getTime())
    ) {
      return `Invalid pay_date format${errorPrefix}.`;
    }
    if (
      item.cost_center_id !== undefined &&
      item.cost_center_id !== null &&
      (typeof item.cost_center_id !== "number" ||
        !Number.isInteger(item.cost_center_id) ||
        item.cost_center_id <= 0)
    ) {
      return `Invalid cost_center_id${errorPrefix}. Must be a positive integer.`;
    }
    return null; // No error
  }

  createValidator = (req, res, next) => {
    const error = this._validateSingle(req.body);
    if (error) {
      return res.status(400).json({ error });
    }
    next();
  };

  createBulkValidator = (req, res, next) => {
    const data = req.user.role === "super_admin" ? req.body.payrolls : req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return res
        .status(400)
        .json({ error: "Request must contain a non-empty array of payrolls." });
    }
    for (let i = 0; i < data.length; i++) {
      const error = this._validateSingle(data[i], i);
      if (error) {
        return res.status(400).json({ error });
      }
    }
    next();
  };

  updateValidator = (req, res, next) => {
    if (Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ error: "At least one field must be provided for update." });
    }
    const error = this._validateSingle(req.body, null, true); 
    if (error) {
      return res.status(400).json({ error });
    }
    next();
  };
}

module.exports = PayrollValidator;