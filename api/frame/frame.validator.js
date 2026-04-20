class FrameValidator {
  createValidator = (req, res, next) => {
    if (req.user.role === "super_admin" && !req.body.tenant_id) {
      return res
        .status(400)
        .json({ error: "Missing required field: tenant_id" });
    }

    const requiredFields = ["name", "brand_id", "selling_price"];
    const missingFields = requiredFields.filter(
      (f) => req.body[f] == null || req.body[f].toString().trim() === "",
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const validGenders = ["male", "female", "unisex"];
    if (req.body.gender && !validGenders.includes(req.body.gender)) {
      return res
        .status(400)
        .json({ error: "Invalid gender. Must be male, female, or unisex." });
    }

    next();
  };

  updateValidator = (req, res, next) => {
    if (Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ error: "At least one field must be provided for update." });
    }
    next();
  };
}

module.exports = FrameValidator;
