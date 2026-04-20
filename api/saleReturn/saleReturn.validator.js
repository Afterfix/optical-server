class SaleReturnValidator {
  createValidator(req, res, next) {
    const requiredFields = [
      "sale_id",
      "item_id",
      "return_quantity",
      "date",
      "invoice_number",
      "payment_methods",
    ];

    const missingFields = requiredFields.filter(
      (field) => req.body[field] === undefined || req.body[field] === null,
    );
    if (missingFields.length > 0) {
      return res
        .status(400)
        .json({
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
    }

    if (
      !Number.isInteger(req.body.sale_id) ||
      !Number.isInteger(req.body.item_id) ||
      !Number.isInteger(req.body.return_quantity)
    ) {
      return res
        .status(400)
        .json({
          error: "sale_id, item_id, and return_quantity must be integers.",
        });
    }

    if (
      !Array.isArray(req.body.payment_methods) ||
      req.body.payment_methods.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "payment_methods must be a non-empty array." });
    }

    for (const payment of req.body.payment_methods) {
      if (
        !payment.account_id ||
        payment.amount === undefined ||
        payment.amount === null
      ) {
        return res
          .status(400)
          .json({
            error: "Each payment method must have account_id and amount",
          });
      }
    }

    next();
  }

  updateValidator(req, res, next) {
    // Re-use the creation logic for updates
    return this.createValidator(req, res, next);
  }

  idParamValidator(req, res, next) {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    next();
  }
}

module.exports = SaleReturnValidator;
