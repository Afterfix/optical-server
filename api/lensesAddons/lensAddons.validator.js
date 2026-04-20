class LensAddonsValidator {
  createValidator = (req, res, next) => {
    if (req.user.role === "super_admin" && !req.body.tenant_id) {
      return res
        .status(400)
        .json({ error: "Missing required field: tenant_id" });
    }

    if (!req.body.name || req.body.name.trim() === "") {
      return res.status(400).json({ error: "Addon name is required." });
    }

    if (req.body.price != null && isNaN(req.body.price)) {
      return res.status(400).json({ error: "Price must be a number." });
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

module.exports = LensAddonsValidator;
