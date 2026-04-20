class LedgerValidator {
  createValidator = (req, res, next) => {
    const requiredFields = [
      "name",
      "balance",
    ];
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

    const numericFields = {
      balance: "Balance",
      done_by_id: "Done By ID",
      cost_center_id: "Cost Center ID",
    };

    for(const field in numericFields) {
      if (
        req.body[field] !== undefined && 
        req.body[field] !== null &&
        req.body[field] !== "" &&
        (isNaN(parseFloat(req.body[field])) || !isFinite(req.body[field]))
      ) {
        return res.status(400).json({ error: `${numericFields[field]} must be a valid number.` });
      }
    }

    next();
  };

  updateValidator = (req, res, next) => {
    const numericFields = [
      "balance",
      "done_by_id",
      "cost_center_id",
    ];

    for (const field of numericFields) {
      if (
        req.body[field] !== undefined &&
        req.body[field] !== null &&
        req.body[field] !== "" &&
        (isNaN(parseFloat(req.body[field])) || !isFinite(req.body[field]))
      ) {
        return res
          .status(400)
          .json({ error: `${field} must be a valid number.` });
      }
    }
    
    // Check if at least one field is being updated
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "No fields provided for update." });
    }

    next();
  };
}

module.exports = LedgerValidator;