class AccountValidator {
  createValidator = (req, res, next) => {
    const requiredFields = ["name", "type"];

    const missingFields = requiredFields.filter(
      (field) =>
        req.body[field] === undefined ||
        req.body[field] === null ||
        req.body[field] === ""
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const allowedTypes = ["cash", "bank"];
    if (!allowedTypes.includes(req.body.type)) {
      return res
        .status(400)
        .json({ error: "Invalid account type. Must be 'cash' or 'bank'." });
    }

    // Optional: Validate initial_balance if provided
    if (
      req.body.initial_balance !== undefined &&
      req.body.initial_balance !== null &&
      req.body.initial_balance !== ""
    ) {
      const balance = parseFloat(req.body.initial_balance);
      if (isNaN(balance) || balance < 0) {
        return res
          .status(400)
          .json({ error: "initial_balance must be a positive number." });
      }
    }

    next();
  };

  updateValidator = (req, res, next) => {
    if (req.body.type && !["cash", "bank"].includes(req.body.type)) {
      return res
        .status(400)
        .json({ error: "Invalid account type. Must be 'cash' or 'bank'." });
    }

    // Explicitly disallow updating balance directly via account update
    if (req.body.amount !== undefined || req.body.balance !== undefined) {
      return res
        .status(400)
        .json({ error: "Cannot update balance directly. Use transactions." });
    }

    next();
  };
}

module.exports = AccountValidator;