class FrameVariantValidator {
  createValidator = (req, res, next) => {
    const { frame_id, sku } = req.body;

    if (req.user.role === "super_admin" && !req.body.tenant_id) {
      return res
        .status(400)
        .json({ error: "Missing required field: tenant_id" });
    }

    if (!frame_id || !sku) {
      return res
        .status(400)
        .json({ error: "Missing required fields: frame_id and sku" });
    }

    if (req.body.stock_qty && !Number.isInteger(req.body.stock_qty)) {
      return res.status(400).json({ error: "stock_qty must be an integer" });
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

module.exports = FrameVariantValidator;
