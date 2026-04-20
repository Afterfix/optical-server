class ExpenseTypeValidator {
  createValidator = (req, res, next) => {
    const requiredFields = ["name"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    next();
  };

  updateValidator = (req, res, next) => {
    if (Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ error: "At least one field must be provided for an update." });
    }

    if (
      req.body.name !== undefined &&
      (typeof req.body.name !== "string" || req.body.name.trim() === "")
    ) {
      return res
        .status(400)
        .json({ error: 'Field "name" must be a non-empty string.' });
    }

    next();
  };
}

module.exports = ExpenseTypeValidator;